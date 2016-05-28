"use strict";

let fs = require('fs-extra');
let path = require('path');
let EventEmitter = require('events');
let _ = require('lodash');
let TypescriptCompiler = require('../lib/TypescriptCompiler');
let LessCompiler = require('../lib/LessCompiler');
let config = require('../config.json');

/**
 * Validates that the icon is valid
 * (20x20 png) 
 */
function getIconType(image) {
    //TODO: add svg icon support
    /** based on https://github.com/image-size/image-size (MIT License) */
    if (image.toString('ascii', 1, 8) !== 'PNG\r\n\x1a\n') return false;
    if (image.toString('ascii', 12, 16) !== 'IHDR') return false;

    var width = image.readUInt32BE(16);
    var height = image.readUInt32BE(20);
    return width == 20 && height == 20 ? 'png' : false; 
}

/**
 * Loads icon png file and converts it to base 64 string
 */
function getBase64Icon(iconPath) {
    let icon = fs.readFileSync(iconPath);
    let iconType = getIconType(icon);
    return iconType ? `data:image/${iconType};base64,` + icon.toString('base64') : false;
}

/**
 * Loads icon and appends it to the existing css
 */
function appendIconCss(guid, icon, cssContent) {
    let iconOptions = {
        guid: guid,
        icon: icon
    };
    let iconTemplate = fs.readFileSync(ICON_TEMPLATE_PATH);
    return cssContent + "\n" + _.template(iconTemplate)(iconOptions); 
}

/**
 * Builds visual from a visual package instance
 * @extends EventEmitter
 * @emits watch_change - when a file change is detected
 * @emits watch_complete - when the build triggered by a watcher is completed
 * @emits watch_error - when a watcher or triggered build task throws an error
 */
class VisualBuilder extends EventEmitter {
    /**
     * Creates a VisualBuilder
     * @param {string} visualPackage - an instace of a visual package to build
     * @param {string} [pluginName=visual.guid] - visual plugin name
     */
    constructor (visualPackage, options) {
        super();
        this.visualPackage = visualPackage;
        this._resetWatchStates();
        this.buildOptions = options || {};
        this.statusPath = visualPackage.buildPath(config.build.dropFolder, 'status');
    }

    /**
     * Compiles visual sources & styles
     */
    build() {
        //TODO: do some validations here
        return LessCompiler.build(this.visualPackage, this.buildOptions)
        .then(() => TypescriptCompiler.build(this.visualPackage, this.buildOptions))
        .then(() => this._createPbivizJson())
        .then(() => this._updateStatus());
    }

    /**
     * Starts watching for file changes
     */
    startWatcher() {
        this.stopWatcher();
        this.watcher = fs.watch(this.visualPackage.basePath, {
            recursive: true
        }, this._fileChangeHandler.bind(this));
        this.watcherInterval = setInterval(this._watchIntervalHandler.bind(this), 500);
    }

    /**
     * Stops watching for file changes
     */
    stopWatcher() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        if (this.watcherInterval) {
            clearInterval(this.watcherInterval);
            this.watcherInterval = null;
        }
        this._resetWatchStates();
    }

    /**
     * Adds content and icon to the pbiviz json
     * @private
     */    
    _createPbivizJson() {
        return new Promise((resolve, reject) => {
            let visualConfig = this.visualPackage.config;
            let iconContent = getBase64Icon(visualConfig.assets.icon);
            if(!iconContent) return reject(new Error('Invalid Icon. Must be 20x20 png.'));
            let dropPath = this.visualPackage.buildPath(config.build.dropFolder);
            let jsContent = fs.readFileSync(path.join(dropPath, 'visual.prod.js')).toString();
            let cssContent = fs.readFileSync(path.join(dropPath, 'visual.prod.css')).toString();
            
            let capabilities = fs.readJsonSync(this.visualPackage.buildPath(visualConfig.capabilities));
            let distPbiviz = _.cloneDeep(visualConfig);
            distPbiviz.capabilities = capabilities;
            distPbiviz.content = {
                js: jsContent,
                css: cssContent,
                iconBase64: iconContent
            }
            if(this.buildOptions.namespace) {
                distPbiviz.visual.guid = this.buildOptions.namespace;
            }
            
            fs.writeFileSync(path.join(dropPath, 'pbiviz.json'),JSON.stringify(distPbiviz));
            resolve();
        });
    }

    /**
     * Updates status file (used for live reload)
     * @param {boolean} [error=false] 
     * @private
     */    
    _updateStatus(error) {
        return new Promise((resolve, reject) => {
            let statusData;
            if(error) {
                statusData = 'error';
            } else {
                let pluginName = this.buildOptions.namespace || this.visualPackage.config.visual.guid;
                statusData = Date.now() + "\n" + pluginName;                            
            }
            
            fs.writeFileSync(this.statusPath, statusData);
            resolve();
        });
    }

    /**
     * Checks the state of all file watchers
     * @private
     */
    _watchIntervalHandler() {
        for (let key in this.watchStates) {
            this._handleWatch(this.watchStates[key]);
        }
    }

    /**
     * Checks state of a watcher. Triggers build if needed
     * @private
     */
    _handleWatch(watchState) {
        if (watchState.changed && !watchState.building) {
            watchState.building = true;
            watchState.changed = false;
            this.emit('watch_change', watchState.name);

            watchState.handler(this.visualPackage, this.buildOptions)
            .then(() => this._createPbivizJson())
            .then(() => this._updateStatus())
            .then(() => {
                this.emit('watch_complete', watchState.name);
                watchState.building = false;
            }).catch((e) => {
                this.emit('watch_error', e);
                this._updateStatus(true);
                watchState.building = false;
            });
        }    
    }

    /**
     * Handles file change events and sets state so the interval will update files
     * @private
     */
    _fileChangeHandler(event, filename) {
        //ignore temp folder
        if(!filename || filename[0] === '.') return;
        let ext = path.extname(filename);
        if (this.watchStates.hasOwnProperty(ext)) {
            this.watchStates[ext].changed = true;
        }
    }
    
    /**
     * Sets watch states to default values
     * @private
     */
    _resetWatchStates() {
        this.watchStates = {
            '.js': {
                changed: false,
                building: false,
                name: 'Javascript',
                handler: TypescriptCompiler.build
            },            
            '.ts': {
                changed: false,
                building: false,
                name: 'Typescript',
                handler: TypescriptCompiler.build
            },
            '.less': {
                changed: false,
                building: false,
                name: 'Less',
                handler: LessCompiler.build
            },
            '.json': {
                changed: false,
                building: false,
                name: 'JSON',
                //TODO: validate / process capabilities here
                handler: () => new Promise((resolve) => resolve())
            }
        };
    }
}

module.exports = VisualBuilder;
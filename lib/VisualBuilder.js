/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

let fs = require('fs-extra');
let path = require('path');
let EventEmitter = require('events');
let _ = require('lodash');
let Validator = require('jsonschema').Validator;
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

    let width = image.readUInt32BE(16);
    let height = image.readUInt32BE(20);
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
 * Builds visual from a visual package instance
 * 
 * @extends EventEmitter
 * @event watch_change - when a file change is detected
 * @event watch_complete - when the build triggered by a watcher is completed
 * @event watch_error - when a watcher or triggered build task throws an error
 */
class VisualBuilder extends EventEmitter {
    /**
     * Creates a VisualBuilder
     * 
     * @param {string} visualPackage - an instace of a visual package to build
     * @param {string} [pluginName=visual.guid] - visual plugin name
     */
    constructor(visualPackage, options) {
        super();
        this.visualPackage = visualPackage;
        this._resetWatchStates();
        this.buildOptions = options || {};
        this.statusPath = visualPackage.buildPath(config.build.dropFolder, 'status');
        this.watchers = [];
    }

    /**
     * Compiles visual sources & styles
     */
    build() {

        return this._validateApiVersion(this.visualPackage)
            .then(() => LessCompiler.build(this.visualPackage, this.buildOptions))
            .then(() => TypescriptCompiler.build(this.visualPackage, this.buildOptions))
            .then(() => this._createPbivizJson())
            .then(() => this._updateStatus());
    }

    /**
     * Starts watching for file changes
     * 
     * @returns {Promise}
     */
    startWatcher() {
        this.stopWatcher();
        return new Promise((resolve, reject) => {
            let basePath = this.visualPackage.basePath;
            let pathSlash = basePath.indexOf('/') !== -1 ? '/' : '\\';
            let basePathLength = basePath.length;
            //recursively add watchers (linux doesn't support recursive: true for a single watcher)
            fs.walk(basePath).on('data', item => {
                //only watch directories
                if (!item.stats.isDirectory()) return;
                //don't watch any hidden folders or their children
                if (item.path.indexOf(pathSlash + '.', basePathLength) !== -1) return;
                this.watchers.push(fs.watch(item.path, { recursive: false }, this._fileChangeHandler.bind(this)));
            }).on('end', () => {
                this.watcherInterval = setInterval(this._watchIntervalHandler.bind(this), 500);
                resolve();
            });
        });
    }

    /**
     * Stops watching for file changes
     */
    stopWatcher() {
        if (this.watchers.length > 0) {
            this.watchers.forEach(watcher => watcher.close());
            this.watchers = [];
        }
        if (this.watcherInterval) {
            clearInterval(this.watcherInterval);
            this.watcherInterval = null;
        }
        this._resetWatchStates();
    }

    /**
     * Validates the visual version (checks pbiviz against d.ts and json schemas)
     * 
     * @param {VisualPackage} visualPackage - instance of a visual package to validate 
     * @private
     */
    _validateApiVersion(visualPackage) {
        return new Promise((resolve, reject) => {
            let version = 'v' + visualPackage.config.apiVersion;

            //check that the api version exists in the .api folder
            try {
                fs.accessSync(visualPackage.buildPath('.api', version));
            } catch (e) {
                if (e && e.code && e.code === 'ENOENT') {
                    return reject([{
                        type: 'validation',
                        message: 'Invalid API Version ' + version
                    }]);
                }
                reject(e);
            }

            //check that tsconfig is referencing the correct version
            let tsConfig = fs.readJsonSync(visualPackage.buildPath('tsconfig.json'));
            let versionDts = `.api/${version}/PowerBI-visuals.d.ts`;
            let apiDtsFiles = tsConfig.files.filter(i => i.match(/.api\/.+\/PowerBI-visuals.d.ts$/));
            if (!tsConfig.files || tsConfig.files.indexOf(versionDts) === -1) {
                return reject([{
                    type: 'validation',
                    message: `The PowerBI-visuals.d.ts in your tsconfig.json must match the api version in pbiviz.json (expected: ${versionDts})`
                }]);
            }

            //all checks passed. resolve the promise
            resolve();
        });
    }

    /**
     * Adds content and icon to the pbiviz json
     * 
     * @private
     */
    _createPbivizJson() {
        return new Promise((resolve, reject) => {
            let visualConfig = this.visualPackage.config;
            let apiVersion = visualConfig.apiVersion;
            let iconContent = getBase64Icon(this.visualPackage.buildPath(visualConfig.assets.icon));
            if (!iconContent) return reject(new Error('Invalid Icon. Must be 20x20 png.'));
            let dropPath = this.visualPackage.buildPath(config.build.dropFolder);
            let jsContent = fs.readFileSync(path.join(dropPath, 'visual.prod.js')).toString();
            let cssContent = fs.readFileSync(path.join(dropPath, 'visual.prod.css')).toString();

            //load and validate capabilities
            let capabilities = fs.readJsonSync(this.visualPackage.buildPath(visualConfig.capabilities));
            let validator = new Validator();
            let schema = fs.readJsonSync(this.visualPackage.buildPath('.api', 'v' + apiVersion, 'schema.capabilities.json'));
            let validation = validator.validate(capabilities, schema);
            if (validation.errors && validation.errors.length > 0) {
                let errors = validation.errors.map(e => {
                    return {
                        filename: visualConfig.capabilities,
                        message: e.stack || 'Unknown error',
                        type: 'json'
                    };
                });
                return reject(errors);
            }

            try {
                this._updateCapabilities(capabilities);
            }
            catch (e) {
                return reject('Failed updating visual capabilities');
            }

            //load and validate dependencies if the file exists for the visual
            let dependencies;
            if (visualConfig.dependencies) {
                let loadDependencies = false;
                let dependenciesFilePath = this.visualPackage.buildPath(visualConfig.dependencies);
                try {
                    fs.accessSync(dependenciesFilePath);
                    loadDependencies = true;
                }
                catch (e) {
                    // We can ignore this error because it means that the dependencies file doesn't exist
                }
                
                if (loadDependencies) {
                    //the R dependencies file was loaded correctly, we should load it and validate it's schema
                    //we should not except any exception in this code
                    dependencies = fs.readJsonSync(dependenciesFilePath);
                    let dependenciesSchema = fs.readJsonSync(this.visualPackage.buildPath('.api', 'v' + apiVersion, 'schema.dependencies.json'));
                    let dependenciesValidation = validator.validate(dependencies, dependenciesSchema);
                    if (dependenciesValidation.errors && dependenciesValidation.errors.length > 0) {
                        let errors = dependenciesValidation.errors.map(e => {
                            return {
                                filename: visualConfig.dependencies,
                                message: e.stack || 'Unknown error',
                                type: 'json'
                            };
                        });
                        return reject(errors);
                    }
                }
            }
            
            let distPbiviz = _.cloneDeep(visualConfig);
            distPbiviz.capabilities = capabilities;
            
            //we deliberately overwrite the dependencies property to make sure it will be undefined when no dependencies file was supplied
            distPbiviz.dependencies = dependencies;
            
            distPbiviz.content = {
                js: jsContent,
                css: cssContent,
                iconBase64: iconContent
            };
            if (this.buildOptions.namespace) {
                distPbiviz.visual.guid = this.buildOptions.namespace;
            }

            fs.writeFileSync(path.join(dropPath, 'pbiviz.json'), JSON.stringify(distPbiviz));
            resolve();
        });
    }

    /**
     * Updates the capabilities content at build time
     * For example for R Custom Visuals, we take the content of a script.yyy file 
     * and place the content of this file inside the capabilities
     * @private
     */
    _updateCapabilities(capabilities) {
        if (capabilities && 
            capabilities.dataViewMappings && 
            capabilities.dataViewMappings.length === 1 && 
            capabilities.dataViewMappings[0].scriptResult) {
            let scriptResult = capabilities.dataViewMappings[0].scriptResult;
            if (scriptResult.script.scriptProviderDefault && !scriptResult.script.scriptSourceDefault) {
                let fileName = this.visualPackage.buildPath('script.' + scriptResult.script.scriptProviderDefault.toLowerCase());
                try {
                    let fileContent = fs.readFileSync(fileName).toString();
                    scriptResult.script.scriptSourceDefault = fileContent;
                }
                catch (e) {
                    throw e;
                }
            }
        }
    }

    /**
     * Updates status file (used for live reload)
     * 
     * @param {boolean} [error=false] 
     * @private
     */
    _updateStatus(error) {
        return new Promise((resolve, reject) => {
            let statusData;
            if (error) {
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
     * 
     * @private
     */
    _watchIntervalHandler() {
        for (let key in this.watchStates) {
            this._handleWatch(this.watchStates[key]);
        }
    }

    /**
     * Checks state of a watcher. Triggers build if needed
     * 
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
     * 
     * @private
     */
    _fileChangeHandler(event, filename) {
        //ignore temp folder
        if (!filename || filename[0] === '.') return;
        let ext = path.extname(filename).toLowerCase();
        if (this.watchStates.hasOwnProperty(ext)) {
            this.watchStates[ext].changed = true;
        }
    }

    /**
     * Sets watch states to default values
     * 
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
                handler: () => new Promise((resolve) => resolve())
            },
            '.r': {
                changed: false,
                building: false,
                name: 'RScript',
                handler: () => new Promise((resolve) => resolve())
            }
        };
    }
}

module.exports = VisualBuilder;

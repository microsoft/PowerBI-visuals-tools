var fs = require('fs');
var path = require('path');
var EventEmitter = require('events');
var _ = require('lodash');
var TypescriptCompiler = require('../lib/TypescriptCompiler');
var LessCompiler = require('../lib/LessCompiler');

/**
 * Represents an instance of a visual builder based on file path
 * @param {string} path - file path to root of visual
 * @emits watch_change - when a file change is detected
 * @emits watch_complete - when the build triggered by a watcher is completed
 * @emits watch_error - when a watcher or triggered build task throws an error
 */
function VisualBuilder(package) {
    this.package = package;
    this.watchStates = {
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
        }
    };
}

//inherit from EventEmitter so we can emit events for the watchers
VisualBuilder.prototype = Object.create(EventEmitter.prototype);

/**
 * Compiles visual sources & styles
 */
VisualBuilder.prototype.build = function () {
    return Promise.all([
        LessCompiler.build(this.package),
        TypescriptCompiler.build(this.package)
    ]);
};

/**
 * Starts watching for file changes
 */
VisualBuilder.prototype.startWatcher = function () {
    this.stopWatcher();
    this.watcher = fs.watch(this.package.basePath, {
        recursive: false
    }, this._fileChangeHandler.bind(this));
    this.watcherInterval = setInterval(this._watchIntervalHandler.bind(this), 500);
};

/**
 * Stops watching for file changes
 */
VisualBuilder.prototype.stopWatcher = function () {
    if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
    }
    if (this.watcherInterval) {
        clearInterval(this.watcherInterval);
        this.watcherInterval = null;
    }
};

/**
 * Checks the state of all file watchers
 * @private
 */
VisualBuilder.prototype._watchIntervalHandler = function () {
    for (var key in this.watchStates) {
        this._handleWatch(this.watchStates[key]);
    }
};

/**
 * Checks state of a watcher. Triggers build if needed
 * @private
 */
VisualBuilder.prototype._handleWatch = function(watchState) {
    if (watchState.changed && !watchState.building) {
        watchState.building = true;
        watchState.changed = false;
        this.emit('watch_change', watchState.name);

        watchState.handler(this.package).then(() => {
            this.emit('watch_complete', watchState.name);
            watchState.building = false;
        }).catch((e) => {
            this.emit('watch_error', e);
            watchState.building = false;
        });
    }    
}

/**
 * Handles file change events and sets state so the interval will update files
 * @private
 */
VisualBuilder.prototype._fileChangeHandler = function (event, filename) {
    var ext = path.extname(filename);
    if (this.watchStates.hasOwnProperty(ext)) {
        this.watchStates[ext].changed = true;
    }
};

module.exports = VisualBuilder;
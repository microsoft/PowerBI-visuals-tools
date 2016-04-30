var fs = require('fs');
var path = require('path');
var EventEmitter = require('events');
var _ = require('lodash');
var TypescriptCompiler = require('../lib/TypescriptCompiler');
var LessCompiler = require('../lib/LessCompiler');

/**
 * Represents an instance of a visual builder based on file path
 * @param {string} path - file path to root of visual
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
 * Interval that checks the state of file watchers and triggers builds
 * @private
 */
VisualBuilder.prototype._watchIntervalHandler = function () {
    for (var key in this.watchStates) {
        var item = this.watchStates[key];
        if (item.changed && !item.building) {
            item.building = true;
            item.changed = false;
            this.emit('watch_change', item.name);
            item.handler(this.package).then(() => {
                this.emit('watch_complete', this.watchStates[key].name);
                item.building = false;
            }).catch((e) => {
                this.emit('watch_error', e);
                item.building = false;
            });
        }
    }
};

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
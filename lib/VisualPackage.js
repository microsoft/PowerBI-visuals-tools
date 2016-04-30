var fs = require('fs');
var path = require('path');
var VisualGenerator = require('../lib/VisualGenerator');

//Directory used to store compiled visuals
const DROP_FOLDER = '.bin';
const DROP_PLUGIN = 'visualPlugin.js';
const DROP_JS = 'visual.js';
const DROP_CSS = 'visual.css';
const CONFIG_FILE = 'pbiviz.json';

/**
 * Creates a new visual package
 * @param {string} rootPath - file path to root of visual package
 * @param {boolean} [force=false] - overwrites existing folder if set to true
 * @returns {Promise<VisualPackage>} - instance of newly created visual package
 */
function createVisualPackage(rootPath, force) {
    return new Promise(function (resolve, reject) {
        VisualGenerator.generate(rootPath, force).then(function () {
            loadVisualPackage(rootPath).then(resolve).catch(reject);
        }).catch(reject);
    });
}

/**
 * Loads an instance of a visual package from a file path
 * @param {string} rootPath - file path to root of visual package
 */
function loadVisualPackage(rootPath) {
    return new Promise(function (resolve, reject) {
        try {
            var package = new VisualPackage(rootPath);
            resolve(package);
        } catch (e) {
            if (e && e.code && e.code === 'MODULE_NOT_FOUND') {
                e = new Error(CONFIG_FILE + ' not found. You must be in the root of a visual project to run this command.');
            }
            reject(e);
        }
    });
}

/**
 * Represents an instance of a visual package based on file path
 * @param {string} rootPath - file path to root of visual package
 */
function VisualPackage(rootPath) {
    this.basePath = rootPath;
    this.dropPath = path.join(rootPath, DROP_FOLDER);
    this.dropPluginPath = path.join(this.dropPath, DROP_PLUGIN);
    this.dropJsPath = path.join(this.dropPath, DROP_JS);
    this.dropCssPath = path.join(this.dropPath, DROP_CSS);
    this.config = require(path.join(this.basePath, CONFIG_FILE));
}

module.exports = {
    createVisualPackage: createVisualPackage,
    loadVisualPackage: loadVisualPackage
};
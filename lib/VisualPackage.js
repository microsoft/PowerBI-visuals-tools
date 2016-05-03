"use strict";

let fs = require('fs');
let path = require('path');
let VisualGenerator = require('../lib/VisualGenerator');

const DROP_FOLDER = '.bin';
const DROP_PLUGIN = 'visualPlugin.js';
const DROP_JS = 'visual.js';
const DROP_CSS = 'visual.css';
const CONFIG_FILE = 'pbiviz.json';

/**
 * Represents an instance of a visual package based on file path
 */
class VisualPackage {
    /**
     * Creates a new visual package
     * @param {string} rootPath - file path to root of visual package
     * @param {boolean} [force=false] - overwrites existing folder if set to true
     * <VisualPackage>} - instance of newly created visual package
     */
    static createVisualPackage(rootPath, visualName, force) {
        return new Promise((resolve, reject) => {
            VisualGenerator.generate(rootPath, visualName, force).then((visualPath) => {
                VisualPackage.loadVisualPackage(visualPath).then(resolve).catch(reject);
            }).catch(reject);
        });
    }

    /**
     * Loads an instance of a visual package from a file path
     * @param {string} rootPath - file path to root of visual package
     * @returns {Promise<VisualPackage>} - instance of newly created visual package
     */
    static loadVisualPackage(rootPath) {
        return new Promise((resolve, reject) => {
            try {
                resolve(new VisualPackage(rootPath));
            } catch (e) {
                if (e && e.code && e.code === 'MODULE_NOT_FOUND') {
                    e = new Error(CONFIG_FILE + ' not found. You must be in the root of a visual project to run this command.');
                }
                reject(e);
            }
        });
    }    
    
    /**
     * Creates a VisualPackage instance
     * @param {string} rootPath - file path to root of visual package
     */    
    constructor(rootPath) {
        this.basePath = rootPath;
        this.dropPath = path.join(rootPath, DROP_FOLDER);
        this.dropPluginPath = path.join(this.dropPath, DROP_PLUGIN);
        this.dropJsPath = path.join(this.dropPath, DROP_JS);
        this.dropCssPath = path.join(this.dropPath, DROP_CSS);
        this.config = require(path.join(this.basePath, CONFIG_FILE));
    }
}

module.exports = VisualPackage;
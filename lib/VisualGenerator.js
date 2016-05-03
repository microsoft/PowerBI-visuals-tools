"use strict";

let fs = require('fs-extra');
let path = require('path');
let uuid = require('node-uuid');

const VISUAL_TEMPLATE_PATH = path.resolve(__dirname + '/../templates/visual');
const GUID_PREFIX = 'PBI-CV-';

/**
 * Generates a random GUID for your visual
 */
function generateVisualGuid() {
    let guid = GUID_PREFIX + uuid.v4();
    return guid.replace(/-/g, '_').toUpperCase();
}

/**
 * Generates a default pbiviz.json config file
 * @param {string} targetPath - file path to root of visual package
 */
function generatePbiVizJson(targetPath) {
    //TODO: probably convert to using template like visual plugin
    let json = {
        "guid": generateVisualGuid(),
        "visualClassName": path.basename(targetPath),
        "apiVersion": '1.0.0',
        "author": {
            "name": "Mickey Mouse",
            "email": "disney@email.com"
        },
        "version": "0.1.0"
    };
    fs.writeFileSync(path.join(targetPath, 'pbiviz.json'), JSON.stringify(json, null, '  '));
}

/**
 * Copies the visual template directory
 * @param {string} targetPath - file path to root of visual package
 */
function copyVisualTemplate(targetPath) {
    fs.copySync(VISUAL_TEMPLATE_PATH, targetPath);
}

class VisualGenerator {
    /**
     * Generates a new visual
     * @param {string} targetPath - file path to root of the new visual package
     * @param {boolean} [force=false] - overwrites existing folder if set to true
     * @returns {Promise} - promise resolves when the package is created 
     */
    static generate(targetPath, force) {
        return new Promise((resolve, reject) => {
            fs.access(targetPath, err => {
                if (!err && !force) {
                    return reject(new Error('This visual already exists. Use force to overwrite.'));
                }
                try {
                    if (!err && force) {
                        fs.removeSync(targetPath);
                    }

                    copyVisualTemplate(targetPath);
                    generatePbiVizJson(targetPath);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}

module.exports = VisualGenerator;
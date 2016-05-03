"use strict";

let fs = require('fs-extra');
let path = require('path');
let uuid = require('node-uuid');
let _ = require('lodash');

const VISUAL_TEMPLATE_PATH = path.resolve(__dirname + '/../templates/visual');
const GUID_PREFIX = 'PBI-CV-';
const PBIVIZ_TEMPLATE_PATH = path.resolve(__dirname + '/../templates/pbiviz.json.template');

/**
 * Generates a random GUID for your visual
 */
function generateVisualGuid() {
    let guid = GUID_PREFIX + uuid.v4();
    return guid.replace(/-/g, '_').toUpperCase();
}

/**
 * Generates the data for the visual
 */
function generateVisualOptions(visualName) {
    return {
        name: generateVisualName(visualName),
        displayName: visualName,
        guid: generateVisualGuid(),
        visualClassName: 'Visual',
        apiVersion: '1.0.0',
    };
}

/**
 * 
 */
function generateVisualName(displayName) {
    return displayName.replace(/(?:^\w|[A-Z]|\b\w|_|\s+)/g, (match, index) => {
        if (/\s|_+/.test(match)) return "";
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });    
}

/**
 * Creates a default pbiviz.json config file
 * @param {Object} options - visual information for populating the pbiviz.json template
 */
function createPbiVizJson(visualPath, options) {
    let pbivizTemplate = fs.readFileSync(PBIVIZ_TEMPLATE_PATH);
    let pbivizJson = _.template(pbivizTemplate)(options);
    fs.writeFileSync(path.join(visualPath, 'pbiviz.json'), pbivizJson);
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
     * @param {string} targetPath - file path for creation of the new visual package
     * @param {string} visualName - name of the new visual package
     * @param {boolean} [force=false] - overwrites existing folder if set to true
     * @returns {Promise<string>} - promise resolves with the path to the newly created package 
     */
    static generate(targetPath, visualName, force) {
        return new Promise((resolve, reject) => {
            
            let options = generateVisualOptions(visualName);
            if(!options || !options.name) {
                return reject(new Error('Invalid visual name'));
            }
            
            let visualPath = path.join(targetPath, options.name);
            fs.access(visualPath, err => {
                if (!err && !force) {
                    return reject(new Error('This visual already exists. Use force to overwrite.'));
                }
                try {
                    if (!err && force) {
                        fs.removeSync(visualPath);
                    }

                    copyVisualTemplate(visualPath);
                    createPbiVizJson(visualPath, options);
                    resolve(visualPath);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}

module.exports = VisualGenerator;
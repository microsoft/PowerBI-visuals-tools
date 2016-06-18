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
let uuid = require('node-uuid');
let _ = require('lodash');

const VISUAL_TEMPLATES_PATH = path.resolve(__dirname + '/../templates/visuals');
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
        apiVersion: '1.1.0',
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
 * @param {string} templateName - template to use for generating the visual
 */
function copyVisualTemplate(targetPath, templateName) {
    fs.copySync(path.join(VISUAL_TEMPLATES_PATH, '_global'), targetPath);
    fs.copySync(path.join(VISUAL_TEMPLATES_PATH, templateName), targetPath);
}

/**
 * Checks if the specified template is valid
 * @param {string} templateName - template to use for generating the visual
 */
function validTemplate(templateName) {
    try {
        fs.accessSync(path.join(VISUAL_TEMPLATES_PATH, templateName))
    } catch(e) {
        return false;
    }
    return true;
}

const defaultOptions = {
    force: false,
    template: 'default'
}

class VisualGenerator {
    /**
     * Generates a new visual
     * @param {string} targetPath - file path for creation of the new visual package
     * @param {string} visualName - name of the new visual package
     * @param {object} options - specify options for the visual generator
     * @returns {Promise<string>} - promise resolves with the path to the newly created package 
     */
    static generate(targetPath, visualName, options) {
        return new Promise((resolve, reject) => {
            let buildOptions = _.defaults(options, defaultOptions);

            let visualOptions = generateVisualOptions(visualName);
            if (!visualOptions || !visualOptions.name) {
                return reject(new Error('Invalid visual name'));
            }
            
            if(!validTemplate(buildOptions.template)) {
                return reject(new Error('Invalid template'));
            }

            let visualPath = path.join(targetPath, visualOptions.name);
            fs.access(visualPath, err => {
                if (!err && !buildOptions.force) {
                    return reject(new Error('This visual already exists. Use force to overwrite.'));
                }
                try {
                    if (!err && buildOptions.force) {
                        fs.removeSync(visualPath);
                    }

                    copyVisualTemplate(visualPath, buildOptions.template);
                    createPbiVizJson(visualPath, visualOptions);
                    resolve(visualPath);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}

module.exports = VisualGenerator;
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
let config = require('../config.json');

const VISUAL_TEMPLATES_PATH = path.join(__dirname, '..', config.templates.visuals);
const GUID_PREFIX = 'PBI-CV-';
const PBIVIZ_TEMPLATE_PATH = path.resolve(__dirname, '..', config.templates.pbiviz);
const API_VERSION = config.generate.apiVersion;

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
function generateVisualOptions(visualName, apiVersion) {
    return {
        name: generateVisualName(visualName),
        displayName: visualName,
        guid: generateVisualGuid(),
        visualClassName: 'Visual',
        apiVersion: apiVersion
    };
}

/**
 * 
 */
function generateVisualName(displayName) {
    return displayName.replace(/(?:^\w|[A-Z]|\b\w|_|\s+)/g, (match, index) => {
        if (/\s|_+/.test(match)) return "";
        return index === 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

/**
 * Creates a default pbiviz.json config file
 * 
 * @param {string} visualPath - path to the visual
 * @param {Object} options - visual information for populating the pbiviz.json template
 */
function createPbiVizJson(visualPath, options) {
    let pbivizTemplate = fs.readFileSync(PBIVIZ_TEMPLATE_PATH);
    let pbivizJson = _.template(pbivizTemplate)(options);
    fs.writeFileSync(path.join(visualPath, 'pbiviz.json'), pbivizJson);
}

/**
 * Copies the visual template directory
 * 
 * @param {string} targetPath - file path to root of visual package
 * @param {string} templateName - template to use for generating the visual
 */
function copyVisualTemplate(targetPath, templateName) {
    fs.copySync(path.join(VISUAL_TEMPLATES_PATH, '_global'), targetPath);
    fs.copySync(path.join(VISUAL_TEMPLATES_PATH, templateName), targetPath);
}

/**
 * Checks if the specified template is valid
 * 
 * @param {string} templateName - template to use for generating the visual
 */
function validTemplate(templateName) {
    try {
        fs.accessSync(path.join(VISUAL_TEMPLATES_PATH, templateName));
    } catch (e) {
        return false;
    }
    return true;
}

const defaultOptions = {
    force: false,
    template: 'default',
    apiVersion: API_VERSION
};

class VisualGenerator {
    /**
     * Generates a new visual
     * 
     * @param {string} targetPath - file path for creation of the new visual package
     * @param {string} visualName - name of the new visual package
     * @param {object} options - specify options for the visual generator
     * @returns {Promise<string>} - promise resolves with the path to the newly created package 
     */
    static generate(targetPath, visualName, options) {
        return new Promise((resolve, reject) => {
            let buildOptions = _.defaults(options, defaultOptions);
            let visualOptions = generateVisualOptions(visualName, buildOptions.apiVersion);
            if (!visualOptions || !visualOptions.name) {
                return reject(new Error('Invalid visual name'));
            }

            if (!validTemplate(buildOptions.template)) {
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
                    VisualGenerator.updateApi(visualPath, visualOptions.apiVersion)
                        .then(() => VisualGenerator.setApiVersion(visualPath, visualOptions.apiVersion))
                        .then(() => resolve(visualPath))
                        .catch(reject);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    /**
     * Copies the api folder for the specified api version
     * 
     * @param {string} targetPath - file path of the root of the visual package
     * @param {string} apiVersion - api version to update
     */
    static updateApi(targetPath, apiVersion) {
        return new Promise((resolve, reject) => {
            let version = 'v' + apiVersion;
            let apiSourcePath = path.join(VISUAL_TEMPLATES_PATH, '.api', version);
            let apiTargetPath = path.join(targetPath, '.api', version);

            if (!VisualGenerator.checkApiVersion(apiVersion)) {
                return reject(new Error('Invalid API version: ' + apiVersion));
            }

            fs.removeSync(apiTargetPath);
            fs.ensureDirSync(apiTargetPath);
            fs.copySync(apiSourcePath, apiTargetPath);
            resolve();
        });
    }

    /**
     * Sets the api version for a visual (tsconfig.json, pbiviz.json, .vscode/settings.json)
     * 
     * @param {string} targetPath - file path of the root of the visual package
     * @param {string} apiVersion - api version to set
     */
    static setApiVersion(targetPath, apiVersion) {
        let pbivizPath = path.join(targetPath, 'pbiviz.json');
        let tsConfigPath = path.join(targetPath, 'tsconfig.json');
        let vsCodeSettingsPath = path.join(targetPath, '.vscode', 'settings.json');

        //set version in pbiviz.json
        let pbiviz = fs.readJsonSync(pbivizPath);
        pbiviz.apiVersion = apiVersion;
        fs.writeJsonSync(pbivizPath, pbiviz);

        //set correct version d.ts file in tsconfig.json
        let tsConfig = fs.readJsonSync(tsConfigPath);
        let typeDefIndex = _.findIndex(tsConfig.files, i => i.match(/.api\/.+\/PowerBI-visuals.d.ts$/));
        tsConfig.files[typeDefIndex] = `.api/v${apiVersion}/PowerBI-visuals.d.ts`;
        fs.writeJsonSync(tsConfigPath, tsConfig);

        //set correct version schemas in .vscode/settings.json
        let vsCodeSettings = fs.readJsonSync(vsCodeSettingsPath);
        vsCodeSettings['json.schemas'].forEach((item, idx) => {
            if (item.url.match(/.api\/.+\/schema.pbiviz.json$/)) {
                vsCodeSettings['json.schemas'][idx].url = `./.api/v${apiVersion}/schema.pbiviz.json`;
            } else if (item.url.match(/.api\/.+\/schema.capabilities.json$/)) {
                vsCodeSettings['json.schemas'][idx].url = `./.api/v${apiVersion}/schema.capabilities.json`;
            }
        });
        fs.writeJsonSync(vsCodeSettingsPath, vsCodeSettings);
    }

    /**
     * Checks an if a specified API version is valid
     * 
     * @param {string} apiVersion - api version to set
     * @returns {boolean} - is this version valid 
     */
    static checkApiVersion(apiVersion) {
        let apiSourcePath = path.join(VISUAL_TEMPLATES_PATH, '.api', 'v' + apiVersion);
        try {
            fs.accessSync(apiSourcePath);
        } catch (e) {
            if (e && e.code && e.code === 'ENOENT') {
                return false;
            }
            throw e;
        }
        return true;
    }
}

module.exports = VisualGenerator;

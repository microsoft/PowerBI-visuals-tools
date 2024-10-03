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

import crypto from 'crypto';
import { getRootPath, readJsonFromRoot } from './utils.js';
import { compareVersions } from "compare-versions";
import fs from 'fs-extra';
import lodashDefaults from 'lodash.defaults';
import path from 'path';
import template from '../templates/pbiviz-json-template.js';

const config = readJsonFromRoot('config.json');

const VISUAL_TEMPLATES_PATH = path.join(getRootPath(), config.templates.visuals);
const API_VERSION = config.generate.apiVersion;
const minAPIversion = config.constants.minAPIversion;

/**
 * Generates the data for the visual
 */
function generateVisualOptions(visualName, apiVersion) {
    const name = generateVisualName(visualName);
    return {
        name: name,
        displayName: visualName,
        guid: name + VisualGenerator.generateVisualGuid(),
        visualClassName: 'Visual',
        apiVersion: apiVersion
    };
}

/**
 * 
 */
function generateVisualName(displayName) {
    return displayName.replace(/(?:^\w|[A-Z]|\b\w|_|\s+)/g, (match, index) => {
        if (/\s|_+/.test(match)) {
            return "";
        }
        return index === 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

/**
 * Creates a default pbiviz.json config file
 * 
 * @param {string} visualPath - path to the visual
 * @param {Object} options - visual information for populating the pbiviz.json template
 * @param {string} templateName - external js files
 */
function createPbiVizJson(visualPath, options, templateName) {

    // read the global template data
    // and generate the actual file content
    let data = template(options);

    // write out the target file content
    const targetPath = path.join(visualPath, 'pbiviz.json');
    fs.writeFileSync(targetPath, data);

    let templatePath = path.join(VISUAL_TEMPLATES_PATH, templateName);
    templatePath = path.join(templatePath, 'pbiviz.json');
    if (templateName && fileExists(templatePath)) {
        //read the target file content 
        data = fs.readJsonSync(targetPath);

        //override externalJS settings with those of the local template file
        const templateData = fs.readJsonSync(templatePath);
        for (const objKey of Object.keys(templateData)) {
            data[objKey] = templateData[objKey];
        }

        // write out the target file content
        fs.writeJsonSync(targetPath, data);
    }
}

/**
 * Checks if the specified file exists
 * 
 * @param {string} file - path to the file 
 */
function fileExists(file) {
    try {
        fs.accessSync(file);
    } catch (e) {
        return false;
    }
    return true;
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
    apiVersion: API_VERSION,
    externalJS: []
};

export default class VisualGenerator {
    /**
     * Generates a new visual
     * 
     * @param {string} targetPath - file path for creation of the new visual package
     * @param {string} visualName - name of the new visual package
     * @param {object} options - specify options for the visual generator
     * @returns {Promise<string>} - promise resolves with the path to the newly created package 
     */
    static generateVisual(targetPath, visualName, options): Promise<string> {
        return new Promise((resolve, reject) => {
            const buildOptions = lodashDefaults(options, defaultOptions);
            if (!buildOptions.apiVersion || compareVersions(buildOptions.apiVersion, minAPIversion) === -1) {
                return reject(new Error(`Can not generate a visual with an API below than ${minAPIversion}, current API is '${buildOptions.apiVersion}'.`));
            }
            const visualOptions = generateVisualOptions(visualName, buildOptions.apiVersion);
            const validationResult = VisualGenerator.checkVisualName(visualOptions.name);
            if (!visualOptions || !visualOptions.name || validationResult) {
                return reject(new Error(validationResult || "Invalid visual name"));
            }

            if (!validTemplate(buildOptions.template)) {
                return reject(new Error(`Invalid template "${buildOptions.template}"`));
            }

            const visualPath = path.join(targetPath, visualOptions.name);
            fs.access(visualPath, err => {
                if (!err && !buildOptions.force) {
                    return reject(new Error('This visual already exists. Use force to overwrite.'));
                }
                try {
                    if (!err && buildOptions.force) {
                        fs.removeSync(visualPath);
                    }
                    copyVisualTemplate(visualPath, buildOptions.template);
                    createPbiVizJson(visualPath, visualOptions, options.template);
                    resolve(visualPath);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    /**
     * Generates a random GUID for your visual
     */
    static generateVisualGuid() {
        return crypto.randomUUID().replace(/-/g, '').toUpperCase();
    }

    /**
     * Check visual name 
     * Using https://github.com/mathiasbynens/mothereff.in/tree/master/js-properties
     * 
     * @static
     * @param {string} name Visual name
     * @returns {string} error message
     * 
     * @memberof VisualGenerator
     */
    static checkVisualName(name) {
        const regexES3ReservedWord = /^(?:do|if|in|for|int|new|try|var|byte|case|char|else|enum|goto|long|null|this|true|void|with|break|catch|class|const|false|final|float|short|super|throw|while|delete|double|export|import|native|public|return|static|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
        const regexNumber = /^(?![+-])([0-9\+\-\.]+)/;
        const regexZeroWidth = /\u200c|\u200d/;
        const regexpWrongSymbols = /^[a-zA-Z0-9]+$/;
        const valueAsUnescapedString = name.replace(/\\u([a-fA-F0-9]{4})|\\u\{([0-9a-fA-F]{1,})\}/g, ($0, $1, $2) => {
            const codePoint = parseInt($2 || $1, 16);
            // If it’s a surrogate…
            if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
                // Return a character that is never valid in an identifier.
                // This prevents the surrogate from pairing with another.
                return '\0';
            }
            return String.fromCodePoint(codePoint);
        });
        if (regexNumber.test(name)) {
            return `The visual name can't begin with a number digit`;
        } else if (!regexpWrongSymbols.test(name)) {
            return `The visual name can contain only letters and numbers`;
        } else if (regexES3ReservedWord.test(valueAsUnescapedString)) {
            return `The visual name cannot be equal to a reserved JavaScript keyword.
                More information: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Keywords`;
        } else if (regexZeroWidth.test(valueAsUnescapedString)) {
            return `The visual name can't be empty`;
        }
    }
}

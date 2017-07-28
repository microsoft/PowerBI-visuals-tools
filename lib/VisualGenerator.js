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
let uuid = require('uuid');
let _ = require('lodash');
let config = require('../config.json');

const VISUAL_TEMPLATES_PATH = path.join(__dirname, '..', config.templates.visuals);
const PBIVIZ_TEMPLATE_PATH = path.resolve(__dirname, '..', config.templates.pbiviz);
const API_VERSION = config.generate.apiVersion;

/**
 * Generates a random GUID for your visual
 */
function generateVisualGuid() {
    return uuid.v4().replace(/-/g, '').toUpperCase();
}

/**
 * Generates the data for the visual
 */
function generateVisualOptions(visualName, apiVersion) {
    const name = generateVisualName(visualName);
    return {
        name: name,
        displayName: visualName,
        guid: name + generateVisualGuid(),
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
 * @param {string} templateName - external js files
 */
function createPbiVizJson(visualPath, options, templateName) {
    let globalTemplatePath = PBIVIZ_TEMPLATE_PATH;

    // read the global template data
    // and generate the actual file content
    let globalTemplateData = fs.readFileSync(globalTemplatePath);
    let data = _.template(globalTemplateData)(options);

    // write out the target file content
    let targetPath = path.join(visualPath, 'pbiviz.json');
    fs.writeFileSync(targetPath, data);

    let templatePath = path.join(VISUAL_TEMPLATES_PATH, templateName);
    templatePath = path.join(templatePath, 'pbiviz.json');
    if (templateName && fileExists(templatePath)) {
        //read the target file content 
        data = fs.readJsonSync(targetPath);

        //override externalJS settings with those of the local template file
        let templateData = fs.readJsonSync(templatePath);
        data.externalJS = templateData.externalJS;

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
 * Generate settings.ts
 * 
 * @param {string} targetPath - file path to root of visual package
 * @param {string} verbose - to verbose output
 */
function generateSettings(targetPath, verbose) {
    let capabilitiesFileName = targetPath + '/capabilities.json';

    fs.readJson(capabilitiesFileName, (err, packageObj) => {
        if (err) {
            console.error(err);
            return;
        }
        if (verbose) {
            console.log('parse capabilities.json. Searching for settings');
            console.log(packageObj.dataRoles[0].displayName);
        }
        let VisualSettingsMethods = 'export class VisualSettings extends DataViewObjectsParser {\n';
        if (packageObj.objects) {
            let subClassesDefinitionArray = [];
            for (let settingsSubClass in packageObj.objects) {
                if (verbose) {
                    console.log('Settings sub class: ' + settingsSubClass);
                }
                let subClassProperties = packageObj.objects[settingsSubClass].properties;
                VisualSettingsMethods += '      public ' + settingsSubClass + ': ' +
                    settingsSubClass + 'Settings = new ' + settingsSubClass + 'Settings();\n';

                let settingsSubClassDefinition = '\n    export class ' + settingsSubClass + 'Settings {\n';

                if (subClassProperties) {
                    for (let property in subClassProperties) {
                        if (verbose) {
                            console.log('property: ' + subClassProperties[property].displayName);
                        }
                        let propertyType = subClassProperties[property].type;
                        if (verbose) {
                            console.log('prop type: ' + propertyType);
                        }
                        // add some spaghetti to this meals
                        settingsSubClassDefinition += '     // ' + subClassProperties[property].displayName +
                            '\n      public ' + property;

                        if (verbose) {
                            console.log(propertyType.keys);
                        }
                        if (propertyType.bool) {
                            if (verbose) {
                                console.log('bool');
                            }
                            settingsSubClassDefinition += ': boolean = true;\n';
                        } else if (propertyType.fill) {
                            if (verbose) {
                                console.log('fill');
                            }
                            settingsSubClassDefinition += ': string = "";\n';
                        } else if (propertyType.formatting) {
                            if (verbose) {
                                console.log('formatting');
                            }
                            if (propertyType.formatting.fontSize) {
                                settingsSubClassDefinition += ': number = 12;\n';
                            }
                        }
                    }
                }
                settingsSubClassDefinition += '     }\n';
                subClassesDefinitionArray.push(settingsSubClassDefinition);
            }
            VisualSettingsMethods += '      }\n';
            // Add properties class per each setting
            for (let subDefinitions in subClassesDefinitionArray) {
                VisualSettingsMethods += subClassesDefinitionArray[subDefinitions];
            }
            if (verbose) {
                console.log('final text: ' + VisualSettingsMethods);
            }

        } else {
            if (verbose) {
                console.log('Settings not found');
            }
            VisualSettingsMethods += '// TODO: fill all visual settings here\n ' +
                '// public dataPoint: DataPointSettings = new DataPointSettings();\n }\n' +
                '// TODO: fill all visual settings here\n// export class DataPointSettings ' +
                '{ \n //    public fill: string = "#005c55";\n// }';
        }
        // read file and update
        let settingsFileName = targetPath + '/src/settings.ts';
        let setingsFileContents = fs.readFileSync(settingsFileName, 'utf8');
        setingsFileContents = setingsFileContents.replace('<%= visualSettingsClasses %>', VisualSettingsMethods);
        fs.writeFileSync(settingsFileName, setingsFileContents);
    });
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
            const validationResult = VisualGenerator.checkVisualName(visualOptions.name);
            if (!visualOptions || !visualOptions.name || validationResult) {
                return reject(new Error(validationResult || "Invalid visual name"));
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
                    generateSettings(visualPath);
                    createPbiVizJson(visualPath, visualOptions, options.template);
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
            }  else if (item.url.match(/.api\/.+\/schema.dependencies.json$/)) {
                vsCodeSettings['json.schemas'][idx].url = `./.api/v${apiVersion}/schema.dependencies.json`;
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

        } else if (regexES3ReservedWord.test(valueAsUnescapedString)) {
            return `The visual name cannot be equal to a reserved JavaScript keyword.
                More information: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Keywords`;
        } else if (regexZeroWidth.test(valueAsUnescapedString)) {
            return `The visual name can't be empty`;
        }
    }
}

module.exports = VisualGenerator;

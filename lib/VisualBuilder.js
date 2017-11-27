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
let EventEmitter = require('events');
let _ = require('lodash');
let Validator = require('jsonschema').Validator;
let TypescriptCompiler = require('../lib/TypescriptCompiler');
let LessCompiler = require('../lib/LessCompiler');
let config = require('../config.json');
let ConsoleWriter = require('../lib/ConsoleWriter');

/**
 * Validates that the icon is valid
 * (20x20 png) 
 */
function getIconType(image) {
    //TODO: add svg icon support
    /** based on https://github.com/image-size/image-size (MIT License) */
    if (image.toString('ascii', 1, 8) !== 'PNG\r\n\x1a\n') return false;
    if (image.toString('ascii', 12, 16) !== 'IHDR') return false;

    let width = image.readUInt32BE(16);
    let height = image.readUInt32BE(20);
    return width == 20 && height == 20 ? 'png' : false;
}

/**
 * Loads icon png file and converts it to base 64 string
 */
function getBase64Icon(iconPath) {
    return new Promise((resolve, reject) => {
        fs.readFile(iconPath, (err, icon) => {
            let iconType = getIconType(icon);
            if (err || !iconType) {
                reject('Invalid Icon. Must be 20x20 png.');
            } else {
                resolve(`data:image/${iconType};base64,` + icon.toString('base64'));
            }
        });
    });
}

/**
 * Builds visual from a visual package instance
 * 
 * @extends EventEmitter
 * @event watch_change - when a file change is detected
 * @event watch_complete - when the build triggered by a watcher is completed
 * @event watch_error - when a watcher or triggered build task throws an error
 */
class VisualBuilder extends EventEmitter {
    /**
     * Creates a VisualBuilder
     * 
     * @param {string} visualPackage - an instace of a visual package to build
     * @param {string} [pluginName=visual.guid] - visual plugin name
     */
    constructor(visualPackage, options) {
        super();
        this.visualPackage = visualPackage;
        this._resetWatchStates();
        this.buildOptions = options || {};
        this.statusPath = visualPackage.buildPath(config.build.dropFolder, 'status');
        this.watchers = [];
    }

    /**
     * Compiles visual sources & styles
     */
    build() {

        return this._validateApiVersion(this.visualPackage)
            .then(() => LessCompiler.build(this.visualPackage, this.buildOptions))
            .then(() => TypescriptCompiler.build(this.visualPackage, this.buildOptions))
            .then(() => this._createPbivizJson())
            .then(() => this._updateStatus());
    }

    /**
     * Starts watching for file changes
     * 
     * @returns {Promise}
     */
    startWatcher() {
        this.stopWatcher();
        return new Promise((resolve, reject) => {
            let basePath = this.visualPackage.basePath;
            let pathSlash = basePath.indexOf('/') !== -1 ? '/' : '\\';
            let basePathLength = basePath.length;
            //recursively add watchers (linux doesn't support recursive: true for a single watcher)
            fs.walk(basePath).on('data', item => {
                //only watch directories
                if (!item.stats.isDirectory()) return;
                //don't watch any hidden folders or their children
                if (item.path.indexOf(pathSlash + '.', basePathLength) !== -1) return;
                this.watchers.push(fs.watch(item.path, { recursive: false }, this._fileChangeHandler.bind(this)));
            }).on('end', () => {
                this.watcherInterval = setInterval(this._watchIntervalHandler.bind(this), 500);
                resolve();
            });
        });
    }

    /**
     * Stops watching for file changes
     */
    stopWatcher() {
        if (this.watchers.length > 0) {
            this.watchers.forEach(watcher => watcher.close());
            this.watchers = [];
        }
        if (this.watcherInterval) {
            clearInterval(this.watcherInterval);
            this.watcherInterval = null;
        }
        this._resetWatchStates();
    }

    /**
     * Validates the visual version (checks pbiviz against d.ts and json schemas)
     * 
     * @param {VisualPackage} visualPackage - instance of a visual package to validate 
     * @private
     */
    _validateApiVersion(visualPackage) {
        return new Promise((resolve, reject) => {
            let version = 'v' + visualPackage.config.apiVersion;

            //check that the api version exists in the .api folder
            try {
                fs.accessSync(visualPackage.buildPath('.api', version));
            } catch (e) {
                if (e && e.code && e.code === 'ENOENT') {
                    return reject([{
                        type: 'validation',
                        message: 'Invalid API Version ' + version
                    }]);
                }
                reject(e);
            }

            //check that tsconfig is referencing the correct version
            let tsConfig = fs.readJsonSync(visualPackage.buildPath('tsconfig.json'));
            let versionDts = `.api/${version}/PowerBI-visuals.d.ts`;
            let apiDtsFiles = tsConfig.files.filter(i => i.match(/.api\/.+\/PowerBI-visuals.d.ts$/));
            if (!tsConfig.files || tsConfig.files.indexOf(versionDts) === -1) {
                return reject([{
                    type: 'validation',
                    message: `The PowerBI-visuals.d.ts in your tsconfig.json must match the api version in pbiviz.json (expected: ${versionDts})`
                }]);
            }

            //all checks passed. resolve the promise
            resolve();
        });
    }

    /**
     * Adds content and icon to the pbiviz json
     * 
     * @private
     */
    _createPbivizJson() {
        let visualConfig = this.visualPackage.config;
        let dropPath = this.visualPackage.buildPath(config.build.dropFolder);
        let readFilePromiseWrapper = (path) => {
            return new Promise((resolve, reject) => {
                fs.readFile(path, 'utf-8', (err, content) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(content);
                    }
                });
            });
        };
        return Promise.all(
            [
                getBase64Icon(this.visualPackage.buildPath(visualConfig.assets.icon)),
                readFilePromiseWrapper(path.join(dropPath, 'visual.prod.js')),
                readFilePromiseWrapper(path.join(dropPath, 'visual.prod.css')),
                this._getCapabilities(visualConfig),
                this._getDependencies(visualConfig),
                this._getLocalization(visualConfig)
            ])
            .then(([iconContent, jsContent, cssContent, capabilities, dependencies, localization]) => {
                try {
                    this._updateCapabilities(capabilities);
                }
                catch (e) {
                    throw 'Failed updating visual capabilities';
                }

                let distPbiviz = _.cloneDeep(visualConfig);
                distPbiviz.capabilities = capabilities;

                //we deliberately overwrite the dependencies property to make sure it will be undefined when no dependencies file was supplied
                distPbiviz.dependencies = dependencies;

                //we deliberately overwrite the stringResources property to make sure it will be undefined when no stringResources file was supplied
                distPbiviz.stringResources = localization;

                distPbiviz.content = {
                    js: jsContent,
                    css: cssContent,
                    iconBase64: iconContent
                };
                if (this.buildOptions.namespace) {
                    distPbiviz.visual.guid = this.buildOptions.namespace;
                }

                return new Promise((resolve, reject) => {
                    fs.writeFile(path.join(dropPath, 'pbiviz.json'), JSON.stringify(distPbiviz), (err) => {
                        if (err) {
                            reject(`Failed write to ${path.join(dropPath, 'pbiviz.json')}`);
                        } else {
                            resolve();
                        }
                    });
                });
            });
    }

    _getCapabilities(visualConfig) {
        return Promise.all(
            [
                new Promise(
                    (resolve, reject) =>
                        fs.readJson(this.visualPackage.buildPath(visualConfig.capabilities), (err, json) => {
                            if (err) {
                                reject(err);
                            }
                            resolve(json);
                        })
                ),
                this._getValidationSchema(this.visualPackage.buildPath('.api', 'v' + visualConfig.apiVersion, 'schema.capabilities.json'))
            ])
            .then(([capabilities, schema]) => {
                let validator = new Validator();
                let validation = validator.validate(capabilities, schema);
                let errors = this._populateErrors(validation.errors, `${visualConfig.capabilities}`, 'json');
                if (errors) {
                    throw errors;
                } else {
                    return capabilities;
                }
            });
    }

    _getDependencies(visualConfig) {
        return new Promise((resolve, reject) => {
            //load and validate dependencies if the file exists for the visual
            if (!visualConfig.dependencies) {
                return resolve();
            }
            let dependenciesFilePath = this.visualPackage.buildPath(visualConfig.dependencies);
            fs.access(dependenciesFilePath, (err) => {
                if (err) {
                    return resolve();
                }
                Promise.all([
                    new Promise(
                        (resolve, reject) =>
                            fs.readJson(dependenciesFilePath, (err, json) => {
                                if (err) {
                                    reject(err);
                                }
                                resolve(json);
                            })
                    ),
                    this._getValidationSchema(this.visualPackage.buildPath('.api', 'v' + visualConfig.apiVersion, 'schema.dependencies.json'))
                ])
                    .then(([dependencies, schema]) => {
                        let validator = new Validator();
                        let validation = validator.validate(dependencies, schema);
                        let errors = this._populateErrors(validation.errors, `${visualConfig.dependencies}`, 'json');
                        if (errors) {
                            reject(errors);
                        } else {
                            resolve(dependencies);
                        }
                    });
            });
        });
    }

    _getLocalization(visualConfig) {
        let stringResourcesPath = this.visualPackage.buildPath('.api', 'v' + visualConfig.apiVersion, 'schema.stringResources.json');

        if (!fs.existsSync(stringResourcesPath)) {
            return undefined;
        }

        let localeResourcesFiles = visualConfig.stringResources ? visualConfig.stringResources.map((path) => this.visualPackage.buildPath(path)) : [];
        return this._getAvialableLocalePaths()
            .then((localeDirPaths) => {
                if (!localeDirPaths || !localeDirPaths.length) {
                    if (!localeResourcesFiles) { return; }
                    // add only string resources localization 
                    return Promise.all([
                        this._getValidationSchema(stringResourcesPath),
                        this._getLocaleFromStringResources(localeResourcesFiles)
                    ])
                        .then(([schema, localeStringJsons]) =>
                            Promise.all(localeStringJsons.map(localeJson => this._validateJsonBySchema(localeJson, schema))));
                }

                return Promise.all([
                    this._getValidationSchema(stringResourcesPath),
                    this._getLocaleFromStringResources(localeResourcesFiles)
                ])
                    .then(([schema, localeStringJsons]) => {
                        const resJsonLocaleCodes = localeDirPaths.map((localePath) => path.parse(localePath).name);
                        const onlyStringLocales = localeStringJsons.filter((item) => resJsonLocaleCodes.findIndex(x => x === item.locale) === -1);

                        let localePromises =
                            localeDirPaths.map((localePath) =>
                                this._getLocaleFromResFile(localePath)
                                    .then((localeJson) => {
                                        let localeStringJson = localeStringJsons.filter((item) => item.locale === localeJson.locale);
                                        if (localeStringJson.length) {
                                            return {
                                                locale: localeJson.locale,
                                                values: Object.assign({}, ...localeStringJson.map(item => item.values), localeJson.values)
                                            };
                                        }
                                        return localeJson;
                                    })
                                    .then((localeJson) => this._validateJsonBySchema(localeJson, schema))
                            );
                        onlyStringLocales.map((localeJson) =>
                            localePromises.push(this._validateJsonBySchema(localeJson, schema)));
                        return Promise.all(localePromises);
                    });
            })
            .then((locales) => this._buildLocalizationObject(locales));
    }

    _getAvialableLocalePaths() {
        return new Promise((resolve, reject) => {
            const localesPath = this.visualPackage.buildPath('stringResources');
            fs.stat(localesPath, (err, stat) => {
                if (err || !stat.isDirectory()) {
                    return resolve([]);
                }
                fs.readdir(localesPath, (err, localeFolders) => {
                    resolve(localeFolders.map(folder => path.resolve(localesPath, folder)));
                });
            });
        })
            .then((folderPaths) => {
                if (!folderPaths.length) {
                    return folderPaths;
                }
                const checkDirectories = folderPaths.map(
                    (folderPath) => new Promise((resolve, reject) =>
                        fs.stat(folderPath, (err, stat) => {
                            if (err) {
                                reject(`Can't read ${folderPath}`);
                            } else {
                                resolve(stat.isDirectory() ? folderPath : null);
                            }
                        })
                    ));
                return Promise.all(checkDirectories);
            })
            .then((folders) => folders.filter((folder) => folder !== null));
    }

    _getLocaleFromStringResources(paths) {
        if (!paths || !paths.length) { return Promise.resolve([]); }
        return new Promise((resolve, reject) => {
            const checkFiles = paths.map(
                (filePath) => new Promise((resolve, reject) =>
                    fs.stat(filePath, (err, stat) => {
                        if (err) {
                            reject(`Can't read ${filePath}`);
                        } else {
                            resolve(!stat.isDirectory() ? filePath : null);
                        }
                    })
                ));
            resolve(Promise.all(checkFiles));
        })
            .then((filePaths) => filePaths.filter((file) => file))
            .then((filePaths) =>
                Promise.all(filePaths
                    .map((file) => new Promise((resolve, reject) => {
                        fs.readJson(file, (err, json) => {
                            if (err) {
                                reject(`Can't read file ${file}`);
                            } else {
                                resolve(json);
                            }
                        });
                    }))
                ))
            .then((jsons) => {
                this.stringResourceCache = jsons;
                return jsons;
            });
    }

    _getLocaleFromResFile(resFilePath) {
        return new Promise(
            (resolve, reject) =>
                fs.readdir(resFilePath, (err, files) => resolve(err ? null : files.map((fileName) => path.resolve(resFilePath, fileName))))
        )
            .then((filePaths) => {
                const checkFiles = filePaths.map(
                    (filePath) => new Promise((resolve, reject) =>
                        fs.stat(filePath, (err, stat) => {
                            if (err) {
                                reject(`Can't read ${filePath}`);
                            } else {
                                resolve(!stat.isDirectory() ? filePath : null);
                            }
                        })
                    ));
                return Promise.all(checkFiles);
            })
            .then((files) => files.filter((file) => file !== null))
            .then((files) => files.filter((file) => path.extname(file) === '.resjson'))
            .then((filePaths) => Promise.all(filePaths
                .map((file) => new Promise((resolve, reject) => {
                    fs.readJson(file, (err, json) => {
                        if (err) {
                            reject(`Can't read file ${file}`);
                        } else {
                            resolve(json);
                        }
                    });
                }))
            ))
            .then((fileJsons) => { return { locale: path.parse(resFilePath).name, values: Object.assign({}, ...fileJsons) }; });
    }

    _getValidationSchema(path) {
        return new Promise(
            (resolve, reject) =>
                fs.readJson(path, (err, json) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(json);
                }));
    }

    _validateJsonBySchema(json, schema) {
        let validator = new Validator();
        const validation = validator.validate(json, schema);
        if (validation.errors.length) {
            throw validation.errors;
        } else {
            return json;
        }
    }

    _buildLocalizationObject(locales) {
        return locales.reduce((result, item) => {
            let loc = item.locale;
            result[loc] = item.values;
            return result;
        }, {});
    }

    /**
     * Populates the error with the appropriate information
     * @private
     */
    _populateErrors(errors, fileName, type) {
        if (errors && errors.length > 0) {
            return errors.map(e => {
                return {
                    filename: fileName,
                    message: e.stack || 'Unknown error',
                    type: type
                };
            });
        }
    }

    /**
     * Updates the capabilities content at build time
     * For example for R Custom Visuals, we take the content of a script.yyy file 
     * and place the content of this file inside the capabilities
     * @private
     */
    _updateCapabilities(capabilities) {
        if (capabilities &&
            capabilities.dataViewMappings &&
            capabilities.dataViewMappings.length === 1 &&
            capabilities.dataViewMappings[0].scriptResult) {
            let scriptResult = capabilities.dataViewMappings[0].scriptResult;
            if (scriptResult.script.scriptProviderDefault && !scriptResult.script.scriptSourceDefault) {
                let fileName = this.visualPackage.buildPath('script.' + scriptResult.script.scriptProviderDefault.toLowerCase());
                try {
                    scriptResult.script.scriptSourceDefault = this._getRScriptsContents(fileName);
                }
                catch (err) {
                    throw err;
                }
            }
        }
    }

    /**
     * Loads R script file and replace 'source("fname")' with fname content
     *
     * @param {string}
     * @private
     */
    _getRScriptsContents(scriptFileName) {
        // regex patterns to find 'source("fname")' and replace them. Also, ignores comments
        const Pattern4FileName = /^[^#\n]*source\s*?\(\s*?['|"]([^()'"]*)['|"]\s*?\)/m;
        const MaxSourceReplacements = 100;

        try {
            let scriptContent = fs.readFileSync(scriptFileName).toString();
            // search and replace 'source(fname)' commands
            for (let i = 0; i < MaxSourceReplacements; i++) {
                let matchListFileName = Pattern4FileName.exec(scriptContent);
                if (matchListFileName === null || matchListFileName.length < 2) {
                    break;
                }
                let tempFname = this.visualPackage.buildPath(matchListFileName[1]);
                let tempContent = '';
                try {
                    tempContent = fs.readFileSync(tempFname).toString();
                }
                catch (err) {
                    ConsoleWriter.error('Can not access file: ' + tempFname);
                    throw (err);
                }
                scriptContent = scriptContent.replace(Pattern4FileName, tempContent);
            }
            return scriptContent;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Updates status file (used for live reload)
     * 
     * @param {boolean} [error=false] 
     * @private
     */
    _updateStatus(error) {
        return new Promise((resolve, reject) => {
            let statusData;
            if (error) {
                statusData = 'error';
            } else {
                let pluginName = this.buildOptions.namespace || this.visualPackage.config.visual.guid;
                statusData = Date.now() + "\n" + pluginName;
            }

            fs.writeFileSync(this.statusPath, statusData);
            resolve();
        });
    }

    /**
     * Checks the state of all file watchers
     * 
     * @private
     */
    _watchIntervalHandler() {
        for (let key in this.watchStates) {
            this._handleWatch(this.watchStates[key]);
        }
    }

    /**
     * Checks state of a watcher. Triggers build if needed
     * 
     * @private
     */
    _handleWatch(watchState) {
        if (watchState.changed && !watchState.building) {
            watchState.building = true;
            watchState.changed = false;
            this.emit('watch_change', watchState.name);

            watchState.handler(this.visualPackage, this.buildOptions)
                .then(() => this._createPbivizJson())
                .then(() => this._updateStatus())
                .then(() => {
                    this.emit('watch_complete', watchState.name);
                    watchState.building = false;
                }).catch((e) => {
                    this.emit('watch_error', e);
                    this._updateStatus(true);
                    watchState.building = false;
                });
        }
    }

    /**
     * Handles file change events and sets state so the interval will update files
     * 
     * @private
     */
    _fileChangeHandler(event, filename) {
        //ignore temp folder
        if (!filename || filename[0] === '.') return;
        let ext = path.extname(filename).toLowerCase();
        if (this.watchStates.hasOwnProperty(ext)) {
            this.watchStates[ext].changed = true;
        }
    }

    /**
     * Sets watch states to default values
     * 
     * @private
     */
    _resetWatchStates() {
        this.watchStates = {
            '.js': {
                changed: false,
                building: false,
                name: 'Javascript',
                handler: TypescriptCompiler.build
            },
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
            },
            '.json': {
                changed: false,
                building: false,
                name: 'JSON',
                handler: () => new Promise((resolve) => resolve())
            },
            '.r': {
                changed: false,
                building: false,
                name: 'RScript',
                handler: () => new Promise((resolve) => resolve())
            },
            '.resjson': {
                changed: false,
                building: false,
                name: 'RESJSON',
                handler: () => new Promise((resolve) => resolve())
            }
        };
    }
}

module.exports = VisualBuilder;

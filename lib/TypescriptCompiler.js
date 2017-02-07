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
let ts = require('typescript');
let _ = require('lodash');
let uglifyJS = require('uglify-js');
let concat = require('source-map-concat');
let config = require('../config.json');
let ConsoleWriter = require('./ConsoleWriter');

const PLUGIN_TEMPLATE_PATH = path.join(__dirname, '..', config.templates.plugin);

/**
 * Compiles TypeScript files into a single file
 * 
 * @param {array<string>} files - an array of files to compile
 * @param {object} compilerOptions - TSC compiler options object
 * @returns {Promise}
 */
function compileTypescript(files, compilerOptions) {
    return new Promise((resolve, reject) => {
        let convertedOptions = ts.convertCompilerOptionsFromJson(compilerOptions);

        //check for configuration errors
        if (convertedOptions.errors && convertedOptions.errors.length > 0) {
            return reject(convertedOptions.errors.map(err => `(${err.code}) ${err.messageText}`));
        }

        //check that options were successfully created
        if (!convertedOptions.options) {
            return reject(["Unknown tsconfig error."]);
        }
        let program = ts.createProgram(files, convertedOptions.options);

        //check for compilation errors
        let allDiagnostics = ts.getPreEmitDiagnostics(program);
        if (allDiagnostics && allDiagnostics.length > 0) {
            return reject(allDiagnostics.map(diagnostic => {
                let errorData = {
                    filename: '',
                    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
                    type: 'typescript'
                };

                if (diagnostic.file) {
                    let results = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                    errorData.filename = cleanFilePath(diagnostic.file.fileName);
                    errorData.line = results.line + 1;
                    errorData.column = results.character + 1;
                }

                return errorData;
            }));
        }

        //create files (source and maps)
        program.emit();
        resolve();
    });
}

function cleanFilePath(filePath) {
    if (!filePath) return "";
    return filePath.split(config.build.precompileFolder).pop();
}

/**
 * Produces minified js files for use in the packaged pbiviz
 * 
 * @param {string} filePath - path to the source js file
 * @param {boolean} [minify=false] - should the production js be minified
 */
function createProdJs(filePath, minify) {
    let minFilePath = filePath.slice(0, -2) + 'prod.js';
    let result;
    if (minify) {
        result = uglifyJS.minify(filePath, {
            'compress': {
                'dead_code': true,
                'global_defs': {
                    DEBUG: false
                }
            }
        }).code;
    } else {
        result = fs.readFileSync(filePath);
    }
    fs.writeFileSync(minFilePath, result);
}

/**
 * Creates a visual plugin from a visual package 
 * 
 * @param {VisualPackage} visualPackage - instance of a visual package to build
 * @param {string} pluginName - name of the plugin
 * @returns {string} path to the created visual plugin
 */
function createPlugin(visualPackage, pluginName) {
    let visualConfig = visualPackage.config;
    let pluginOptions = {
        pluginName: pluginName,
        visualGuid: visualConfig.visual.guid,
        visualClass: visualConfig.visual.visualClassName,
        visualDisplayName: visualConfig.visual.displayName,
        visualVersion: visualConfig.visual.version,
        apiVersion: visualConfig.apiVersion
    };
    let pluginTemplate = fs.readFileSync(PLUGIN_TEMPLATE_PATH);
    let pluginTs = _.template(pluginTemplate)(pluginOptions);
    let pluginDropPath = visualPackage.buildPath(config.build.precompileFolder, 'visualPlugin.ts');
    fs.ensureDirSync(path.dirname(pluginDropPath));
    fs.writeFileSync(pluginDropPath, pluginTs);
    return pluginDropPath;
}

/**
 * Copies a file and adds the visual namespace
 * 
 * @param {string} source - path of the file to copy 
 * @param {string} target - path to write the new file
 * @param {string} guid - visual guid to append to namespace 
 */
function copyFileWithNamespace(source, target, guid) {
    let fileContents = fs.readFileSync(source).toString();
    let re = new RegExp("module powerbi.extensibility.visual((.|\\n)*?)\s*{", "g");
    let output = fileContents.replace(re, "module powerbi.extensibility.visual." + guid + "$1 {");
    fs.writeFileSync(target, output);
}

/**
 * Creates a copy of the typescript files of a package and appends the guid namespace
 * 
 * @param {VisualPackage} visualPackage - instance of a visual package
 * @param {string[]} files - array of files to copy (from tsconfig)
 * @returns {string[]} list of created files
 */
function copyPackageFilesWithNamespace(visualPackage, files) {
    let guid = visualPackage.config.visual.guid;
    return files.map(file => {
        let filePath = visualPackage.buildPath(file);
        let targetPath = visualPackage.buildPath(config.build.precompileFolder, file);
        let normalizedFileName = path.basename(filePath).toLowerCase().trim();

        if (normalizedFileName.slice(-5) === '.d.ts') {
            //d.ts file - fix file path
            return filePath;
        }

        fs.ensureDirSync(path.dirname(targetPath));

        if (normalizedFileName.slice(-3) === '.ts') {
            //ts file - add namespace and copy
            copyFileWithNamespace(filePath, targetPath, guid);
            return targetPath;
        }

        //other file (js) - copy as-is
        fs.copySync(filePath, targetPath);
        return targetPath;
    });
}

/**
 * Concatenates external js resource referenced in pbiviz.externalJS
 * 
 * @param {VisualPackage} visualPackage - instance of a visual package
 */
function concatExternalJS(visualPackage) {
    return new Promise((resolve, reject) => {
        let files = visualPackage.config.externalJS;
        if (!files || files.length < 1) return resolve();

        let visualJsName = config.build.js;
        let visualJsPath = visualPackage.buildPath(config.build.dropFolder, visualJsName);
        let visualJsMapPath = visualJsPath + '.map';

        let concatFiles = files.map(file => {
            return {
                source: file,
                code: fs.readFileSync(visualPackage.buildPath(file)).toString()
            };
        });

        concatFiles.push({
            source: visualJsName,
            code: fs.readFileSync(visualJsPath).toString(),
            map: fs.readFileSync(visualJsMapPath).toString()
        });

        let concatResult = concat(concatFiles, {
            delimiter: '\n',
            mapPath: visualJsName + '.map'
        }).toStringWithSourceMap({
            file: visualJsName
        });

        fs.writeFileSync(visualJsPath, concatResult.code);
        fs.writeFileSync(visualJsMapPath, concatResult.map.toString());

        resolve();
    });
}

class TypescriptCompiler {
    /**
     * Builds typescript of a visual package
     * 
     * @param {VisualPackage} package - An instance of a visual package
     * @returns {Promise}
     */
    static build(visualPackage, options) {
        options = options || {};

        let visualConfig = visualPackage.config;
        let pluginName = options.namespace || visualConfig.visual.guid;

        return new Promise((resolve, reject) => {
            //TODO: visual specific TS validation
            let tsconfig = require(visualPackage.buildPath('tsconfig.json'));
            let tmpFiles = copyPackageFilesWithNamespace(visualPackage, tsconfig.files);
            let visualJsPath = visualPackage.buildPath(config.build.dropFolder, config.build.js);

            if (options.plugin === false) {
                ConsoleWriter.info('Power BI custom visual plugin has been disabled');
            } else {
                const pluginPath = createPlugin(visualPackage, pluginName);

                tmpFiles.push(pluginPath);
            }

            tsconfig.compilerOptions.out = visualJsPath;

            compileTypescript(tmpFiles, tsconfig.compilerOptions)
                .then(() => concatExternalJS(visualPackage))
                .then(() => createProdJs(visualJsPath, options.minify))
                .then(resolve).catch(reject);
        });
    }
}

module.exports = TypescriptCompiler;

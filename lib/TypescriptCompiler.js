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

const fs = require('fs-extra');
const path = require('path');
const ts = require('typescript');
const _ = require('lodash');
const concat = require('source-map-concat');
const config = require('../config.json');
const ConsoleWriter = require('./ConsoleWriter');
const encoding = "utf8";

const PLUGIN_TEMPLATE_PATH = path.join(__dirname, '..', config.templates.plugin);

/**
 * Whatches TypeScript files and compiles into javascript
 * 
 * @param {array<string>} rootFileNames - an array of files to watch and compile
 * @param {object} options - TSC compiler options object
 * @returns {Promise}
 */
function runWatcher(rootFileNames, options, packagemode, visualPackage) {
    const files = {};
    for (let fileName in rootFileNames) {
        files[rootFileNames[fileName]] = { version: 0 };
    }

    const servicesHost = {
        getScriptFileNames: () => rootFileNames,
        getScriptVersion: (fileName) => files[fileName] && files[fileName].version.toString(),
        getScriptSnapshot: (fileName) => {
            if (!fs.existsSync(fileName)) {
                return null;
            }

            return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
        },
        getCurrentDirectory: () => process.cwd(),
        getCompilationSettings: () => options,
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
        readDirectory: ts.sys.readDirectory
    };

    if (options.outDir) {
        if (!fs.existsSync(options.outDir)) {
            fs.mkdir(options.outDir);
        }
    }
    if (options.out && options.out.length) {
        let out = options.out.split("/");
        out.pop();
        let buildPath = out.join(path.sep);
        if (!fs.existsSync(buildPath)) {
            fs.mkdir(buildPath);
        }
    }
    const services = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

    try {
        rootFileNames.forEach((fileName) => {
            // First time around, emit all files
            emitFile(fileName);
            // Add a watch on the file to handle next change
            if (packagemode) {
                return;
            }
            fs.watchFile(fileName,
                {
                    persistent: true,
                    interval: 250
                },
                (curr, prev) => {
                    // Check timestamp
                    if (Number(curr.mtime) <= Number(prev.mtime)) {
                        return;
                    }

                    // Update the version to signal a change in the file
                    files[fileName].version++;

                    // write the changes to disk
                    emitFile(fileName);
                    concatExternalJS(visualPackage);
                    // appendExportPowerBINameSpace(visualPackage, options);
                });
        });
    }
    catch (ex) {
        ConsoleWriter.error(ex.message);
        ConsoleWriter.error(ex.path);
        return;
    }

    function emitFile(fileName) {
        let output = services.getEmitOutput(fileName);

        ConsoleWriter.info(`Compile ${fileName}`);

        output.outputFiles.forEach(o => {
            fs.writeFileSync(o.name, o.text, "utf8");
        });
    }

    return services;
}

/**
 * Creates a visual plugin from a visual package 
 * 
 * @param {VisualPackage} visualPackage - instance of a visual package to build
 * @param {string} pluginName - name of the plugin
 * @returns {string} path to the created visual plugin
 */
async function createPlugin(visualPackage, pluginName) {
    let visualConfig = visualPackage.config;
    let pluginOptions = {
        pluginName: pluginName,
        visualGuid: visualConfig.visual.guid,
        visualClass: visualConfig.visual.visualClassName,
        visualDisplayName: visualConfig.visual.displayName,
        visualVersion: visualConfig.visual.version,
        apiVersion: visualConfig.apiVersion
    };
    let pluginTemplate = await fs.readFile(PLUGIN_TEMPLATE_PATH);
    let pluginTs = _.template(pluginTemplate)(pluginOptions);
    let pluginDropPath = visualPackage.buildPath(config.build.precompileFolder, 'visualPlugin.ts');
    await fs.ensureDir(path.dirname(pluginDropPath));
    await fs.writeFile(pluginDropPath, pluginTs);
    return pluginDropPath;
}

/**
 * Concatenates external js resource referenced in pbiviz.externalJS
 * 
 * @param {VisualPackage} visualPackage - instance of a visual package
 */
async function concatExternalJS(visualPackage) {
    let files = visualPackage.config.externalJS;
    if (!files || files.length < 1) {
        return;
    }

    let tsconfig = require(visualPackage.buildPath('tsconfig.json'));
    let visualJsName = tsconfig.compilerOptions.out;
    let visualJsPath = visualPackage.buildPath(visualJsName);
    let visualJsMapPath = visualJsPath + '.map';

    let visualJsMap = JSON.parse((await fs.readFile(visualJsMapPath)).toString());
    visualJsMap.sourceRoot = path.posix.relative(config.build.dropFolder, config.build.precompileFolder);

    let concatFiles = files.map(file => {
        return {
            source: file,
            code: (fs.readFileSync(visualPackage.buildPath(file))).toString()
        };
    });

    concatFiles.push({
        source: visualJsName,
        code: (await fs.readFile(visualJsPath)).toString(),
        map: (await fs.readFile(visualJsMapPath)).toString()
    });

    let concatResult = concat(concatFiles, {
        delimiter: '\n',
        mapPath: visualJsName + '.map'
    }).toStringWithSourceMap({
        file: visualJsName
    });

    await fs.writeFile(visualJsPath, concatResult.code);
    await fs.writeFile(visualJsMapPath, concatResult.map.toString());
}

async function appendExportPowerBINameSpace(visualPackage, compilerOptions) {
    if (compilerOptions.outDir) {
        // we should not use externalJS in modern style modules
        return;
    }
    let visualJsName = compilerOptions.out;
    let visualJSFileContent = "";
    let visualJSFilePath = visualPackage.buildPath(visualJsName);

    visualJSFileContent += "\n" + fs.readFileSync(visualJSFilePath, { encoding: encoding });
    visualJSFileContent = "\nvar powerbi = window.powerbi;\n" + visualJSFileContent;
    await fs.writeFile(visualJSFilePath, visualJSFileContent);
}

module.exports = {
    concatExternalJS,
    runWatcher,
    createPlugin,
    appendExportPowerBINameSpace
};

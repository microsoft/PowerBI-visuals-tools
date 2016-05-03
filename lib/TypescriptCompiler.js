"use strict"

var fs = require('fs');
var path = require('path');
var ts = require('typescript');
var _ = require('lodash');
var Concat = require('concat-with-sourcemaps');

const PLUGIN_TEMPLATE_PATH = path.resolve(__dirname + '/../templates/plugin.js.template');

/**
 * Compiles TypeScript files into a single file
 * @param {string} visualPath - root path of the visual project
 * @returns {Promise}
 */
function compileTypescript(visualPath) {
    return new Promise((resolve, reject) => {
        let tsconfig = require(path.join(visualPath, 'tsconfig.json'));
        let convertedOptions = ts.convertCompilerOptionsFromJson(tsconfig.compilerOptions);
        
        //check for configuration errors
        if(convertedOptions.errors && convertedOptions.errors.length > 0) {
            return reject(convertedOptions.errors.map(err => `(${err.code}) ${err.messageText}`));
        }
        
        //check that options were successfully created
        if (!convertedOptions.options) {
            return reject(["Unknown tsconfig error."]);
        }

        let program = ts.createProgram(tsconfig.files, convertedOptions.options);

        //check for compilation errors
        let allDiagnostics = ts.getPreEmitDiagnostics(program);
        if(allDiagnostics && allDiagnostics.length > 0) {
            return reject(allDiagnostics.map(diagnostic => {
                let results = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

                return {
                    filename: diagnostic.file.fileName,
                    line: results.line + 1,
                    column: results.character + 1,
                    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
                    type: 'typescript'
                };                
            }));
        }
        
        //create files (source and maps)
        program.emit();
        resolve();
    });
}

/**
 * Compiles the visual plugin and appends it to the visual.js
 */
function appendPlugin(visualPath, options) {
    return new Promise((resolve, reject) => {
        try {
            let visualMapPath = visualPath + '.map';
            let pluginTemplate = fs.readFileSync(PLUGIN_TEMPLATE_PATH);
            let pluginJs = _.template(pluginTemplate)(options);
            let concat = new Concat(true, 'compiled.js', '\n');
            concat.add('visual.js', fs.readFileSync(visualPath), fs.readFileSync(visualMapPath));
            concat.add('visualPlugin.js', pluginJs);
            fs.writeFileSync(visualPath, concat.content);
            fs.writeFileSync(visualMapPath, concat.sourceMap);
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}


class TypescriptCompiler {
    /**
     * Builds typescript of a visual package
     * @param {VisualPackage} package - An instance of a visual package
     * @returns {Promise}
     */
    static build(visualPackage) {
        var config = visualPackage.config;
        return new Promise((resolve, reject) => {
            compileTypescript(visualPackage.basePath).then(() => {
                var pluginOptions = {
                    guid: config.guid,
                    className: config.visualClassName,
                    apiVersion: config.apiVersion
                }
                appendPlugin(visualPackage.dropJsPath, pluginOptions).then(() => {
                    resolve();
                }).catch((e) => {
                    reject(e);
                });
            }).catch(function (e) {
                reject(e);
            });

        });
    }
}

module.exports = TypescriptCompiler;
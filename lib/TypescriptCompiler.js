"use strict";

let fs = require('fs-extra');
let path = require('path');
let ts = require('typescript');
let _ = require('lodash');
let Concat = require('concat-with-sourcemaps');
let config = require('../config.json');

const PLUGIN_TEMPLATE_PATH = path.join(__dirname, '..', config.templates.plugin);

/**
 * Compiles TypeScript files into a single file
 * @param {string} visualPath - root path of the visual project
 * @returns {Promise}
 */
function compileTypescript(files, compilerOptions) {
    return new Promise((resolve, reject) => {
        let convertedOptions = ts.convertCompilerOptionsFromJson(compilerOptions);
        
        //check for configuration errors
        if(convertedOptions.errors && convertedOptions.errors.length > 0) {
            return reject(convertedOptions.errors.map(err => `(${err.code}) ${err.messageText}`));
        }
        
        //check that options were successfully created
        if (!convertedOptions.options) {
            return reject(["Unknown tsconfig error."]);
        }
        let program = ts.createProgram(files, convertedOptions.options);

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
 * Creates a visual plugin from a visual package 
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
 * @param {string} source - path of the file to copy 
 * @param {string} target - path to write the new file
 * @param {string} guid - visual guid to append to namespace 
 */
function copyFileWithNamespace(source, target, guid) {
    if(path.extname(source).toLowerCase() === '.ts') {
        let fileContents = fs.readFileSync(source).toString();
        let re = new RegExp("module powerbi.extensibility.visual((.|\\n)*?)\s*{", "g");
        let output = fileContents.replace(re, "module powerbi.extensibility.visual." + guid + "$1 {");
        fs.ensureDirSync(path.dirname(target));
        fs.writeFileSync(target, output);
    } else if(source[9] === './typings') {
        //don't copy typings files
    } else {
        fs.copySync(source, target);
    }
}

/**
 * Creates a copy of the typescript files of a package and appends the guid namespace
 * @param {VisualPackage} visualPackage - instance of a visual package
 * @params {string[]} files - array of files to copy (from tsconfig)
 * @returns {string[]} list of created files
 */
function copyPackageFilesWithNamespace(visualPackage, files) {
    let guid = visualPackage.config.visual.guid;
    return files.map(file => {
        let filePath = visualPackage.buildPath(file);
        let targetPath = visualPackage.buildPath(config.build.precompileFolder, file);
        copyFileWithNamespace(filePath, targetPath, guid);
        return targetPath;
    });
}

function createTypingsLink(visualPackage) {
    let sourcePath = visualPackage.buildPath('typings');
    let targetPath = visualPackage.buildPath(config.build.precompileFolder, 'typings');
    fs.removeSync(targetPath);
    //TODO: add symbolic link (on windows must use shell to execute mklink)
    // fs.linkSync(sourcePath, targetPath);
    fs.copySync(sourcePath, targetPath);
}

class TypescriptCompiler {
    /**
     * Builds typescript of a visual package
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
            let pluginPath = createPlugin(visualPackage, pluginName);
            let tmpFiles = copyPackageFilesWithNamespace(visualPackage, tsconfig.files);
            createTypingsLink(visualPackage);
            tmpFiles.push(pluginPath);
            tsconfig.compilerOptions.out = visualPackage.buildPath(config.build.dropFolder, config.build.js);
            compileTypescript(tmpFiles, tsconfig.compilerOptions).then(resolve).catch(reject);
        });
    }
}

module.exports = TypescriptCompiler;
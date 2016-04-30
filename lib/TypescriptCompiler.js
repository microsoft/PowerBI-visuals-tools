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
    return new Promise(function(resolve, reject) {
        var tsconfig = require(path.join(visualPath, 'tsconfig.json'));
        var convertedOptions = ts.convertCompilerOptionsFromJson(tsconfig.compilerOptions);
        
        //check for configuration errors
        if(convertedOptions.errors && convertedOptions.errors.length > 0) {
            return reject(convertedOptions.errors.map(function(err){
                return `(${err.code}) ${err.messageText}`;
            }));
        }
        
        //check that options were successfully created
        if (!convertedOptions.options) {
            return reject(["Unknown tsconfig error."]);
        }

        var program = ts.createProgram(tsconfig.files, convertedOptions.options);

        //check for compilation errors
        var allDiagnostics = ts.getPreEmitDiagnostics(program);
        if(allDiagnostics && allDiagnostics.length > 0) {
            return reject(allDiagnostics.map(diagnostic => {
                var results = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                var line = results.line;
                var character = results.character;
                var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                
                return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
            }));
        }
        
        //create files (source and maps)
        program.emit();
        resolve();

        // Sort output (uneeded? seems to be the default behavior now)
        // var sourceFiles = program.getSourceFiles();
        // var sourceFileMap = {};
        // sourceFiles.forEach(function(f){
        //     sourceFileMap[f.fileName] = f;
        // });
        // tsConfig.files.forEach(function(file){
        //     console.log('file', file);
        //     program.emit(sourceFileMap[file]);
        // });

    });
}

/**
 * Compiles the visual plugin and appends it to the visual.js
 */
function appendPlugin(visualPath, options) {
    return new Promise(function (resolve, reject) {
        try {
            var visualMapPath = visualPath + '.map';
            var pluginTemplate = fs.readFileSync(PLUGIN_TEMPLATE_PATH);
            var pluginJs = _.template(pluginTemplate)(options);
            var concat = new Concat(true, 'compiled.js', '\n');
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

/**
 * Builds typescript of a visual package
 * @param {VisualPackage} package - An instance of a visual package
 * @returns {Promise}
 */
function build(package) {
    var config = package.config;
    return new Promise((resolve, reject) => {
        compileTypescript(package.basePath).then(() => {
            var pluginOptions = {
                guid: config.guid,
                className: config.visualClassName,
                apiVersion: config.apiVersion
            }
            appendPlugin(package.dropJsPath, pluginOptions).then(() => {
                resolve();
            }).catch((e) => {
                reject(e);
            });
        }).catch(function (e) {
            reject(e);
        });

    });
}

module.exports = {
    build: build
};
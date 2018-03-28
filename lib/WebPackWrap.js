"use strict";


const ts = require('typescript');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const webpackConfig = require('./webpack.config');
const PowerBICustomVisualsWebpackPlugin = require('powerbi-customvisuals-webpack-plugin');
const ProvidePlugin = require("webpack").ProvidePlugin;
const ConsoleWriter = require('../lib/ConsoleWriter');
require('expose-loader');
// const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

class WebPackGenerator {

    static applyWebpackConfig(visualPackage, options) {
        options = options || {};
        let cwd = process.cwd();
        const encoding = "utf8";
        return new Promise(function (resolve, reject) {
            const tsconfigPath = visualPackage.buildPath('tsconfig.json');
            const tsconfig = require(tsconfigPath);

            const pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
            const pbiviz = require(pbivizJsonPath);

            const capabliliesPath = pbiviz.capabilities;
            const capabliliesFile = require(path.join(process.cwd(), capabliliesPath));
            visualPackage.config.capabilities = capabliliesFile;

            let files = [];
            let precompileFolder = path.join(visualPackage.basePath, config.build.precompileFolder);
            if (!fs.existsSync(precompileFolder)) {
                fs.mkdirSync(precompileFolder);
            }
            for (let file in tsconfig.files) {
                if (tsconfig.files[file].indexOf(".d.ts") === -1) {
                    files.push("./" +  tsconfig.files[file]); 
                    console.log(tsconfig.files[file]); 
                }
            }

            let visualJSFile = "visualJSPack.js";
            let visualJSFilePath = path.join(precompileFolder, visualJSFile);
            let visualJSFileContent = "";
            // append exteernal js to bundle
            if (pbiviz.externalJS) {
                for (let file in pbiviz.externalJS) {
                    visualJSFileContent += "\n" + fs.readFileSync("./" +  pbiviz.externalJS[file], {encoding: encoding});
                }
            }

            // compile visual TS separately
            // TODO use TypescriptCompiler.js
            let convertedOptions = ts.convertCompilerOptionsFromJson(tsconfig.compilerOptions);
            let program = ts.createProgram(files, convertedOptions.options);
            let allDiagnostics = ts.getPreEmitDiagnostics(program);
            allDiagnostics.forEach(diagnostic => {
                ConsoleWriter.error(`${diagnostic.messageText}`);
            })
            program.emit();

            // append visual js to custom bundle
            let visualCompiledSource = tsconfig.compilerOptions.out;
            visualJSFileContent += "\n" + fs.readFileSync("./" + visualCompiledSource, {encoding: encoding});

            // create plugin
            let pluginOptions = {
                pluginName: `${pbiviz.visual.guid}${ options.devMode ? '_DEBUG' : ''}`,
                visualGuid: pbiviz.visual.guid,
                visualClass: pbiviz.visual.visualClassName,
                visualDisplayName: pbiviz.visual.displayName,
                visualVersion: pbiviz.visual.version,
                apiVersion: pbiviz.apiVersion
              };
          
            let pluginTemplate = fs.readFileSync(path.join(__dirname, "..", "templates", "plugin.js.template"));
            let pluginJS = _.template(pluginTemplate)(pluginOptions);

            // export powerbi namespace with the visual and externalJS files content
            visualJSFileContent += "\nmodule.exports.default = powerbi;";
            fs.writeFileSync(
                visualJSFilePath,
                visualJSFileContent
            );

            // custom bundle is entry point for wabpck builder
            // put externalJS and visual source into one webpack module
            files = [visualJSFilePath];

            webpackConfig.plugins.push(
                new PowerBICustomVisualsWebpackPlugin({
                    ...visualPackage.config,
                    devMode: typeof options.devMode === "undefined" ? true : options.devMode,
                    capablilies: capabliliesFile
                })
            );
            // webpackConfig.plugins.push(
            //     new ProvidePlugin({
            //         "powerbi": path.join(config.build.precompileFolder,hackFile).replace(/\\/g,"/")
            //     })
            // );
            webpackConfig.output.path = path.join(visualPackage.basePath, config.build.dropFolder);
            webpackConfig.devServer.contentBase = path.join(visualPackage.basePath, config.build.dropFolder);
            webpackConfig.devServer.https = {
                key: config.server.privateKey,
                cert: config.server.certificate,
                pfx: config.server.pfx
            };
            webpackConfig.module.rules.pop();
            webpackConfig.module.rules.push( 
                {
                    test: /\.tsx?$/,
                    loader: require.resolve('./VisualCodeLoader.js'),
                    exclude: /node_modules/
                }
            );
            let entryIndex = 0;
            webpackConfig.entry = {
                "powerbi": files
            };

            resolve(webpackConfig);
        });
    }
}


module.exports = WebPackGenerator;
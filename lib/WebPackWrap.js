"use strict";

const ts = require('typescript');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const PowerBICustomVisualsWebpackPlugin = require('powerbi-customvisuals-webpack-plugin');
const ProvidePlugin = require("webpack").ProvidePlugin;
const ConsoleWriter = require('../lib/ConsoleWriter');
const TypescriptCompiler = require('../lib/TypescriptCompiler');
const LessCompiler = require('../lib/LessCompiler');
const util = require('util');
const encoding = "utf8";
const ExtractTextPlugin = require("extract-text-webpack-plugin");
// const MiniCssExtractPlugin = require("mini-css-extract-plugin");

require('expose-loader');

class WebPackGenerator {

    static prepareFolders(visualPackage) {
        let tmpFolder = path.join(visualPackage.basePath, ".tmp");
        if (!fs.existsSync(tmpFolder)) {
            fs.mkdirSync(tmpFolder);
        }
        let precompileFolder = path.join(visualPackage.basePath, config.build.precompileFolder);
        if (!fs.existsSync(precompileFolder)) {
            fs.mkdirSync(precompileFolder);
        }
        let dropFolder = path.join(config.build.dropFolder);
        if (!fs.existsSync(dropFolder)) {
            fs.mkdirSync(dropFolder);
        }
    }

    static appendExportPowerBINameSpace(visualPackage, tsconfig) {
        return new Promise((resolve, reject) => {
            if (!visualPackage ||
                !visualPackage.config ||
                !visualPackage.config.externalJS ||
                !visualPackage.config.externalJS.length
            ) {
                // we should not use externalJS in modern style modules
                resolve();
                return;
            }
            let visualJsName = tsconfig.compilerOptions.out;
            let visualJSFileContent = "";
            let visualJSFilePath = visualPackage.buildPath(visualJsName);
            const pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
            const pbiviz = require(pbivizJsonPath);
            
            visualJSFileContent += "\n" + fs.readFileSync(visualJSFilePath, { encoding: encoding });
            visualJSFileContent =  "\nvar powerbi = globalPowerbi;\n" + visualJSFileContent;
            visualJSFileContent += "\nmodule.exports = { powerbi };";
            console.log("./" + path.join(config.build.dropFolder, config.build.css).replace(/\\/g, "/"));
            fs.writeFileSync(
                visualJSFilePath,
                visualJSFileContent
            );
            resolve();
        });
    }

    static prepareWebPackConfig(visualPackage, options, tsconfig) {
        return new Promise((resolve, reject) => {
            const pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
            const pbiviz = require(pbivizJsonPath);
            const capabliliesPath = pbiviz.capabilities;
            const capabliliesFile = require(path.join(process.cwd(), capabliliesPath));
            const webpackConfig = require('./webpack.config');
            const visualJsName = tsconfig.compilerOptions.out;
            const visualJsOutDir = tsconfig.compilerOptions.outDir;
            const visualJSFilePath = visualPackage.buildPath(visualJsName || visualJsOutDir);
            let externalJSFiles = [];
            let externalJSFilesContent = "";
            let externalJSFilesPath = path.join(visualPackage.basePath, config.build.precompileFolder, "externalJS.js");
            if (pbiviz.externalJS) {
                for (let file in pbiviz.externalJS) {
                    externalJSFilesContent += "\n" + fs.readFileSync("./" +  pbiviz.externalJS[file], { encoding: encoding });
                    externalJSFiles.push(path.join(visualPackage.basePath, pbiviz.externalJS[file]));
                }
            }
            fs.writeFileSync(externalJSFilesPath, externalJSFilesContent, { encoding: encoding });

            webpackConfig.plugins.push(
                new ExtractTextPlugin("[name].css")
            );
            let configuration = visualPackage.config;

            configuration.devMode = (typeof options.devMode === "undefined") ? true : options.devMode;
            configuration.cssStyles = path.join(visualPackage.basePath, config.build.dropFolder, config.build.css);
            webpackConfig.plugins.push(
                new PowerBICustomVisualsWebpackPlugin(configuration)
            );
            webpackConfig.output.path = path.join(visualPackage.basePath, config.build.dropFolder);
            webpackConfig.output.filename = "[name]";
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
            webpackConfig.module.rules.push( 
                {
                    test: /\.css?$/,
                    use: ExtractTextPlugin.extract({
                        fallback: "style-loader",
                        use: "css-loader",
                    })
                }
            );

            let entryIndex = 0;
            if (visualJsName) {
                webpackConfig.entry = {
                    "visual.js": [visualJSFilePath],
                };
                resolve(webpackConfig);
            }
            if (visualJsOutDir) {
                fs.readdir(visualJSFilePath, function (err, files) {
                    webpackConfig.entry = [];
                    files.forEach(file => {
                        if (file.split(".").pop() == "js") {
                            webpackConfig.entry.push(path.join(visualJSFilePath, file));
                        }
                    });
                    webpackConfig.entry = {
                        "visual.js": webpackConfig.entry
                    };
                    resolve(webpackConfig);
                });
            }
        });
    }

    static applyWebpackConfig(visualPackage, options) {
        options = options || {};
        let cwd = process.cwd();
        return new Promise(function (resolve, reject) {
            const tsconfigPath = visualPackage.buildPath('tsconfig.json');
            const tsconfig = require(tsconfigPath);

            const pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
            const pbiviz = require(pbivizJsonPath);

            const capabliliesPath = pbiviz.capabilities;
            const capabliliesFile = require(path.join(process.cwd(), capabliliesPath));
            visualPackage.config.capabilities = capabliliesFile;

            WebPackGenerator.prepareFolders(visualPackage);
            
            TypescriptCompiler
                .runWatcher(tsconfig.files, tsconfig.compilerOptions)
                .then(() => LessCompiler.build(visualPackage, options))
                .then(() => WebPackGenerator.appendExportPowerBINameSpace(visualPackage, tsconfig))
                .then(() => WebPackGenerator.prepareWebPackConfig(visualPackage, options, tsconfig))
                .then((webpackConfig) => resolve(webpackConfig));
        });
    }
}

module.exports = WebPackGenerator;

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
const util = require('util');
const encoding = "utf8";

require('expose-loader');
// const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

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
            visualJSFileContent += "\n" + fs.readFileSync(visualJSFilePath, {encoding: encoding});
            visualJSFileContent += "\nmodule.exports = { powerbi };";
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
            const visualJSFilePath = visualPackage.buildPath(visualJsName);
            webpackConfig.plugins.push(
                new PowerBICustomVisualsWebpackPlugin({
                    ...visualPackage.config,
                    devMode: typeof options.devMode === "undefined" ? true : options.devMode,
                    capablilies: capabliliesFile
                })
            );
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
                "powerbi": [visualJSFilePath]
            };
            resolve(webpackConfig);
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
                .compileTypescript(tsconfig.files, tsconfig.compilerOptions)
                .then(() => TypescriptCompiler.concatExternalJS(visualPackage))
                .then(() => WebPackGenerator.appendExportPowerBINameSpace(visualPackage, tsconfig))
                .then(() => WebPackGenerator.prepareWebPackConfig(visualPackage, options, tsconfig))
                .then((webpackConfig) => resolve(webpackConfig));
        });
    }
}

module.exports = WebPackGenerator;
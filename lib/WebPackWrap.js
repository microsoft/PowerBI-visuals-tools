"use strict";

const fs = require('fs-extra');
const path = require('path');
const config = require('../config.json');
const PowerBICustomVisualsWebpackPlugin = require('powerbi-visuals-webpack-plugin');
const TypescriptCompiler = require('../lib/TypescriptCompiler');
const LessCompiler = require('../lib/LessCompiler');
const encoding = "utf8";
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ConsoleWriter = require('../lib/ConsoleWriter');
const Visualizer = require('webpack-visualizer-plugin');

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

    static async appendExportPowerBINameSpace(visualPackage, tsconfig) { // jshint ignore:line
        if (tsconfig.compilerOptions.outDir) {
            // we should not use externalJS in modern style modules
            return;
        }
        let visualJsName = tsconfig.compilerOptions.out;
        let visualJSFileContent = "";
        let visualJSFilePath = visualPackage.buildPath(visualJsName);
        
        visualJSFileContent += "\n" + fs.readFileSync(visualJSFilePath, { encoding: encoding });
        visualJSFileContent =  "\nvar powerbi = globalPowerbi;\n" + visualJSFileContent;
        visualJSFileContent += "\nmodule.exports = { powerbi };";
        fs.writeFileSync(
            visualJSFilePath,
            visualJSFileContent
        );
    }

    static loadAPIPackage() {
        try {
            let basePath = require.resolve("powerbi-visuals-api", { paths: [process.cwd()] });
            return require(basePath);
        }
        catch (ex) {
            ConsoleWriter.error("powerbi-visuals-api package not found");
            ConsoleWriter.info("type `npm install --save-dev \"powerbi-visuals-api\"` to resolve");
            return null;
        }
    }

    static async prepareWebPackConfig(visualPackage, options, tsconfig) { // jshint ignore:line
        const pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
        const pbiviz = require(pbivizJsonPath);
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
        let pluginConfiguration = visualPackage.config;

        if (tsconfig.compilerOptions.outDir) {
            const api = this.loadAPIPackage(visualPackage); // jshint ignore:line
            if (!api) {
                return null;
            }
            pluginConfiguration.apiVersion = api.version;
            pluginConfiguration.capabilitiesSchema = api.schemas.capabilities;
            pluginConfiguration.pbivizSchema = api.schemas.pbiviz;
            pluginConfiguration.stringResourcesSchema = api.schemas.stringResources;
            pluginConfiguration.dependenciesSchema = api.schemas.dependencies;
        } else {
            pluginConfiguration.schemaLocation = path.join(process.cwd(), '.api', 'v' + pbiviz.apiVersion);
        }

        pluginConfiguration.devMode = (typeof options.devMode === "undefined") ? true : options.devMode;
        pluginConfiguration.cssStyles = path.join(visualPackage.basePath, config.build.dropFolder, config.build.css);
        pluginConfiguration.generatePbiviz = options.generatePbiviz;
        pluginConfiguration.generateResources = options.generateResources;
        pluginConfiguration.minifyJS = options.minifyJS;
        pluginConfiguration.dependencies = pbiviz.dependencies;
        
        if (options.minifyJS) {
            webpackConfig.mode = "development";
            webpackConfig.optimization = {
                minimize: true,
                minimizer: [
                    new UglifyJsPlugin({
                        sourceMap: true,
                        cache: false
                    })
                ]
            };
        } 
        webpackConfig.plugins.push(
            new Visualizer({
                filename: "./webpack.statistics.html"
            })
        );
        ConsoleWriter.info(
            "Webpack stats file location:\n" +
            path.join(
                visualPackage.basePath,
                config.build.dropFolder,
                "./webpack.statistics.html"
            ));
        webpackConfig.plugins.push(
            new PowerBICustomVisualsWebpackPlugin(pluginConfiguration)
        );
        
        webpackConfig.output.path = path.join(visualPackage.basePath, config.build.dropFolder);
        webpackConfig.output.filename = "[name]";
        webpackConfig.devServer.contentBase = path.join(visualPackage.basePath, config.build.dropFolder);
        webpackConfig.devServer.https = {
            key: config.server.privateKey,
            cert: config.server.certificate,
            pfx: config.server.pfx,
            passphrase: config.server.passphrase
        };
        webpackConfig.module.rules.pop();
        webpackConfig.module.rules.push( 
            {
                test: /\.tsx?$/,
                loader: require.resolve('./VisualCodeLoader.js'),
                exclude: /node_modules/
            }
        );

        if (visualJsName) {
            webpackConfig.entry = {
                "visual.js": [visualJSFilePath],
            };
            return webpackConfig;
        }
        if (visualJsOutDir) {
            if (tsconfig.files) {
                webpackConfig.entry = {
                    "visual.js": tsconfig.files
                };
                return webpackConfig;
            } else {
                ConsoleWriter.error("tsconfig.files are undefined");
                return null;
            }
        } else {
            return webpackConfig;
        }
    }

    static applyWebpackConfig(visualPackage, options) {
        options = options || {};
        return new Promise(function (resolve, reject) {
            const tsconfigPath = visualPackage.buildPath('tsconfig.json');
            const tsconfig = require(tsconfigPath);

            const pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
            const pbiviz = require(pbivizJsonPath);

            const capabliliesPath = pbiviz.capabilities;
            const capabliliesFile = require(path.join(process.cwd(), capabliliesPath));
            visualPackage.config.capabilities = capabliliesFile;

            const dependenciesPath = pbiviz.dependencies && path.join(process.cwd(), pbiviz.dependencies);
            const dependenciesFile = fs.existsSync(dependenciesPath) && require(dependenciesPath);
            visualPackage.config.dependencies = dependenciesFile || {};

            WebPackGenerator.prepareFolders(visualPackage);
            
            // new style
            if (tsconfig.compilerOptions.outDir) {
                LessCompiler.build(visualPackage, options)
                    .then(() => WebPackGenerator.prepareWebPackConfig(visualPackage, options, tsconfig))
                    .then(resolve);
                // old style
            } else {
                TypescriptCompiler
                    .runWatcher(tsconfig.files, tsconfig.compilerOptions, !options.devMode)
                    .then(() => LessCompiler.build(visualPackage, options))
                    .then(() => WebPackGenerator.appendExportPowerBINameSpace(visualPackage, tsconfig))
                    .then(() => WebPackGenerator.prepareWebPackConfig(visualPackage, options, tsconfig))
                    .then(resolve);
            }
        });
    }
}

module.exports = WebPackGenerator;

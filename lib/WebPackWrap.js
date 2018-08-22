"use strict";

const fs = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const config = require('../config.json');
const PowerBICustomVisualsWebpackPlugin = require('powerbi-visuals-webpack-plugin');
const TypescriptCompiler = require('../lib/TypescriptCompiler');
const LessCompiler = require('../lib/LessCompiler');
const encoding = "utf8";
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ConsoleWriter = require('../lib/ConsoleWriter');
const Visualizer = require('webpack-visualizer-plugin');
const uglifyJS = require('uglify-js');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const _ = require("lodash");

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

    static loadAPIPackage() {
        try {
            let basePath = require.resolve("powerbi-visuals-api", { paths: [process.cwd()] });
            return require(basePath);
        }
        catch (ex) {
            return null;
        }
    }

    static async prepareWebPackConfig(visualPackage, options, tsconfig) {
        const pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
        const pbiviz = require(pbivizJsonPath);
        const webpackConfig = require('./webpack.config');
        const visualJsName = tsconfig.compilerOptions.out;
        const visualJsOutDir = tsconfig.compilerOptions.outDir;
        const visualJSFilePath = visualPackage.buildPath(visualJsName || visualJsOutDir);

        let pluginConfiguration = _.cloneDeep(visualPackage.config);

        if (tsconfig.compilerOptions.outDir) {
            let api = this.loadAPIPackage(visualPackage);
            // if the powerbi-visual-api package wasn't installed
            // install the powerbi-visual-api, with version from apiVersion in pbiviz.json
            // or the latest version the API if apiVersion is absent in pbiviz.json
            if (api === null || pbiviz.apiVersion != api.version) {
                let apiVersion = pbiviz.apiVersion ? pbiviz.apiVersion : "latest";
                try {
                    ConsoleWriter.info(`Installing API: ${apiVersion}...`);
                    let { stdout, stderr } = await exec(`npm install --save powerbi-visuals-api@${apiVersion}`);
                    ConsoleWriter.info(stdout);
                    ConsoleWriter.error(stderr);
                    api = this.loadAPIPackage(visualPackage);
                }
                catch (ex) {
                    if (ex.message.indexOf("No matching version found for powerbi-visuals-api") !== -1) {
                        throw new Error(`Error: Invalid API version: ${apiVersion}`);
                    }
                    ConsoleWriter.error(`npm install powerbi-visuals-api@${apiVersion} failed`);
                    return;
                }
            }
            pluginConfiguration.apiVersion = api.version;
            pluginConfiguration.capabilitiesSchema = api.schemas.capabilities;
            pluginConfiguration.pbivizSchema = api.schemas.pbiviz;
            pluginConfiguration.stringResourcesSchema = api.schemas.stringResources;
            pluginConfiguration.dependenciesSchema = api.schemas.dependencies;
        } else {
            pluginConfiguration.schemaLocation = path.join(process.cwd(), '.api', 'v' + pbiviz.apiVersion);
            pluginConfiguration.externalJS = [path.join(visualPackage.basePath, config.build.precompileFolder, "externalJS.js")];
            pluginConfiguration.cssStyles = path.join(visualPackage.basePath, config.build.dropFolder, config.build.css);
        }

        pluginConfiguration.customVisualID = `CustomVisual_${pbiviz.visual.guid}`.replace(/[^\w\s]/gi, '');
        pluginConfiguration.devMode = (typeof options.devMode === "undefined") ? true : options.devMode;
        pluginConfiguration.generatePbiviz = options.generatePbiviz;
        pluginConfiguration.generateResources = options.generateResources;
        pluginConfiguration.minifyJS = options.minifyJS;
        pluginConfiguration.dependencies = pbiviz.dependencies;
        pluginConfiguration.modules = typeof tsconfig.compilerOptions.outDir !== "undefined";
        pluginConfiguration.visualSourceLocation = path.posix.relative(config.build.precompileFolder, tsconfig.files[0]).replace(".ts", "");

        if (options.minifyJS) {
            webpackConfig.mode = "production";
            webpackConfig.optimization = {
                minimize: true,
                minimizer: [
                    new UglifyJsPlugin({
                        sourceMap: true,
                        cache: false,
                        extractComments: true,
                        uglifyOptions: {
                            "dead_code": true
                        }
                    })
                ]
            };
            webpackConfig.plugins.push(
                new webpack.HashedModuleIdsPlugin()
            );
        }
        ConsoleWriter.info(
            "Webpack stats file location:\n" +
            path.join(
                visualPackage.basePath,
                config.build.dropFolder,
                config.build.stats
            ));
        webpackConfig.plugins.push(
            new Visualizer({
                filename: config.build.stats
            }),
            new PowerBICustomVisualsWebpackPlugin(pluginConfiguration),
            new FriendlyErrorsWebpackPlugin()
        );

        if (tsconfig.compilerOptions.out) {
            webpackConfig.output.library = pluginConfiguration.customVisualID;
        }
        webpackConfig.output.path = path.join(visualPackage.basePath, config.build.dropFolder);
        webpackConfig.output.filename = "[name]";
        webpackConfig.devServer.contentBase = path.join(visualPackage.basePath, config.build.dropFolder);
        webpackConfig.devServer.https = {
            key: config.server.privateKey,
            cert: config.server.certificate,
            pfx: config.server.pfx,
            passphrase: config.server.passphrase
        };

        if (tsconfig.compilerOptions.out) {
            webpackConfig.entry = {
                "visual.js": [visualJSFilePath]
            };
        }
        else {
            const pluginFileName = "visualPlugin.ts";
            let pluginLocation = path.join(process.cwd(), ".tmp", "precompile", pluginFileName);
            webpackConfig.entry["visual.js"] = [pluginLocation];
            webpackConfig.plugins.push(
                new webpack.WatchIgnorePlugin([pluginLocation])
            );
        }

        return webpackConfig;
    }

    static async assemblyExternalJSFiles(visualPackage, minifyJS, tsOutFile) {
        const pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
        const pbiviz = require(pbivizJsonPath);
        let externalJSFilesContent = "";
        let externalJSFilesPath = path.join(visualPackage.basePath, config.build.precompileFolder, "externalJS.js");
        if (pbiviz.externalJS) {
            for (let file in pbiviz.externalJS) {
                let fileContent = fs.readFileSync(visualPackage.buildPath(pbiviz.externalJS[file]), encoding);
                if (minifyJS) {
                    fileContent = uglifyJS.minify(fileContent, {
                        'compress': {
                            'dead_code': true,
                            'global_defs': {
                                DEBUG: false
                            }
                        }
                    }).code;
                }
                externalJSFilesContent += "\n" + fileContent;
            }
        }
        let outfileContent = await fs.readFile(visualPackage.buildPath(tsOutFile), encoding);
        outfileContent = externalJSFilesContent + "\n" + outfileContent;
        await fs.writeFile(
            path.join(visualPackage.basePath, tsOutFile),
            outfileContent,
            {
                encoding: encoding
            });
        return externalJSFilesPath;
    }

    static async applyWebpackConfig(visualPackage, options) {
        options = options || {};
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

        let webpackConfig;
        // new style
        if (tsconfig.compilerOptions.outDir) {
            // check apiVersion in package.json and installed version
            webpackConfig = await WebPackGenerator.prepareWebPackConfig(visualPackage, options, tsconfig);
            // old style
        } else {
            ConsoleWriter.warn("For better development experience, we strongly recommend converting the visual to es2015 modules");
            ConsoleWriter.warn("https://microsoft.github.io/PowerBI-visuals/docs/latest/how-to-guide/migrating-to-powerbi-visuals-tools-3-0");
            let pluginDropPath = await TypescriptCompiler
                .createPlugin(
                    visualPackage,
                    `${pbiviz.visual.guid}${options.devMode ? "_DEBUG" : ""}`
                );
            tsconfig.files.push(pluginDropPath);

            await TypescriptCompiler.runWatcher(tsconfig.files, tsconfig.compilerOptions, !options.devMode, visualPackage);
            await TypescriptCompiler.concatExternalJS(visualPackage);
            // await WebPackGenerator.assemblyExternalJSFiles(visualPackage, options.minifyJS, tsconfig.compilerOptions.out);
            await LessCompiler.build(visualPackage, options);
            await TypescriptCompiler.appendExportPowerBINameSpace(visualPackage, tsconfig.compilerOptions);
            webpackConfig = await WebPackGenerator.prepareWebPackConfig(visualPackage, options, tsconfig);
        }
        return webpackConfig;
    }
}

module.exports = WebPackGenerator;

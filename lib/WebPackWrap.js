"use strict";

const fs = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const config = require('../config.json');
const PowerBICustomVisualsWebpackPlugin = require('powerbi-visuals-webpack-plugin');
const TypescriptCompiler = require('../lib/TypescriptCompiler');
const LessCompiler = require('../lib/LessCompiler');
const encoding = "utf8";
const ConsoleWriter = require('../lib/ConsoleWriter');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
const Visualizer = require('webpack-visualizer-plugin');
const uglifyJS = require('uglify-js');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const _ = require("lodash");

class WebPackGenerator {

    static async prepareFolders(visualPackage) {
        let tmpFolder = path.join(visualPackage.basePath, ".tmp");
        let precompileFolder = path.join(visualPackage.basePath, config.build.precompileFolder);
        let dropFolder = path.join(visualPackage.basePath, config.build.dropFolder);
        let packgeDropFolder = path.join(visualPackage.basePath, config.package.dropFolder);
        await fs.ensureDir(tmpFolder);
        await fs.ensureDir(precompileFolder);
        await fs.ensureDir(dropFolder);
        await fs.ensureDir(packgeDropFolder);
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

    async installAPIpackage() {
        let apiVersion = this.pbiviz.apiVersion ? `~${this.pbiviz.apiVersion}` : "latest";
        try {
            ConsoleWriter.info(`Installing API: ${apiVersion}...`);
            let { stdout, stderr } = await exec(`npm install --save powerbi-visuals-api@${apiVersion}`);
            ConsoleWriter.info(stdout);
            ConsoleWriter.error(stderr);
            return true;
        }
        catch (ex) {
            if (ex.message.indexOf("No matching version found for powerbi-visuals-api") !== -1) {
                throw new Error(`Error: Invalid API version: ${apiVersion}`);
            }
            ConsoleWriter.error(`npm install powerbi-visuals-api@${apiVersion} failed`);
            return false;
        }
    }

    enableOptimization() {
        this.webpackConfig.mode = "production";
        this.webpackConfig.optimization = {
            concatenateModules: false,
            minimize: true
        };
    }

    configureDevServer(visualPackage) {
        this.webpackConfig.devServer.contentBase = path.join(visualPackage.basePath, config.build.dropFolder);
        this.webpackConfig.devServer.https = {
            key: config.server.privateKey,
            cert: config.server.certificate,
            pfx: config.server.pfx,
            passphrase: config.server.passphrase
        };
    }

    configureVisualPlugin(tsconfig, visualPackage) {
        const visualJSFilePath = visualPackage.buildPath(tsconfig.compilerOptions.out || tsconfig.compilerOptions.outDir);
        this.webpackConfig.output.path = path.join(visualPackage.basePath, config.build.dropFolder);
        this.webpackConfig.output.filename = "[name]";
        if (tsconfig.compilerOptions.out) {
            this.webpackConfig.output.library = `CustomVisual_${this.pbiviz.visual.guid}`.replace(/[^\w\s]/gi, '');
            this.webpackConfig.entry = {
                "visual.js": [visualJSFilePath]
            };
        }
        else {
            let visualPluginPath = path.join(process.cwd(), config.build.precompileFolder, "visualPlugin.ts");
            this.webpackConfig.entry["visual.js"] = [visualPluginPath];
            this.webpackConfig.plugins.push(
                new webpack.WatchIgnorePlugin([visualPluginPath])
            );
        }
    }

    async configureCustomVisualsWebpackPlugin(visualPackage, options, tsconfig) {
        let pluginConfiguration = _.cloneDeep(visualPackage.config);

        if (tsconfig.compilerOptions.outDir) {
            let api = WebPackGenerator.loadAPIPackage(visualPackage);
            // if the powerbi-visual-api package wasn't installed
            // install the powerbi-visual-api, with version from apiVersion in pbiviz.json
            // or the latest version the API if apiVersion is absent in pbiviz.json
            if (api === null || (typeof this.pbiviz.apiVersion !== "undefined" && this.pbiviz.apiVersion != api.version)) {
                await this.installAPIpackage();
                api = WebPackGenerator.loadAPIPackage(visualPackage);
            }
            pluginConfiguration.apiVersion = api.version;
            pluginConfiguration.capabilitiesSchema = api.schemas.capabilities;
            pluginConfiguration.pbivizSchema = api.schemas.pbiviz;
            pluginConfiguration.stringResourcesSchema = api.schemas.stringResources;
            pluginConfiguration.dependenciesSchema = api.schemas.dependencies;
        } else {
            pluginConfiguration.schemaLocation = path.join(process.cwd(), '.api', 'v' + this.pbiviz.apiVersion);
            pluginConfiguration.externalJS = [path.join(visualPackage.basePath, config.build.precompileFolder, "externalJS.js")];
            pluginConfiguration.cssStyles = path.join(visualPackage.basePath, config.build.dropFolder, config.build.css);
        }

        pluginConfiguration.customVisualID = `CustomVisual_${this.pbiviz.visual.guid}`.replace(/[^\w\s]/gi, '');
        pluginConfiguration.devMode = (typeof options.devMode === "undefined") ? true : options.devMode;
        pluginConfiguration.generatePbiviz = options.generatePbiviz;
        pluginConfiguration.generateResources = options.generateResources;
        pluginConfiguration.minifyJS = options.minifyJS;
        pluginConfiguration.dependencies = this.pbiviz.dependencies;
        pluginConfiguration.modules = typeof tsconfig.compilerOptions.outDir !== "undefined";
        pluginConfiguration.visualSourceLocation = path.posix.relative(config.build.precompileFolder, tsconfig.files[0]).replace(".ts", "");
        pluginConfiguration.pluginLocation = path.join(config.build.precompileFolder, "visualPlugin.ts");
        return pluginConfiguration;
    }

    async appendPlugins(options, visualPackage, tsconfig) {
        let pluginConfiguration = await this.configureCustomVisualsWebpackPlugin(visualPackage, options, tsconfig);

        let statsFilename = config.build.stats.split("/").pop();
        let statsLocation = config.build.stats.split("/").slice(0, -1).join(path.sep);
        statsFilename = statsFilename.split(".").slice(0, -1).join(".");
        statsFilename = `${statsFilename}.${options.devMode ? "dev" : "prod"}.html`;

        this.webpackConfig.plugins.push(
            new Visualizer({
                filename: path.join(statsLocation, statsFilename)
            }),
            new PowerBICustomVisualsWebpackPlugin(pluginConfiguration),
            new ExtraWatchWebpackPlugin({
                files: [
                    this.pbivizJsonPath,
                    visualPackage.buildPath(this.pbiviz.capabilities)
                ]
            }),
            new FriendlyErrorsWebpackPlugin(),
            new webpack.ProvidePlugin({
                window: 'realWindow',
                define: 'fakeDefine',
                powerbi: 'corePowerbiObject'
            })
        );
    }

    configureLoaders(target = "es5") {
        if (target === "es5") {
            let babelOptions = {
                "presets": [
                    [
                        require.resolve('@babel/preset-env'),
                        {
                            "targets": {
                                "ie": "11"
                            },
                            useBuiltIns: "usage",
                            modules: false
                        }
                    ]
                ]
            };

            this.webpackConfig.module.rules.push(
                {
                    test: /\.ts|tsx$/,
                    include: /powerbi-visuals-utils-|src|precompile\\visualPlugin.ts/,
                    use: [
                        {
                            loader: require.resolve('babel-loader'),
                            options: babelOptions
                        },
                        {
                            loader: require.resolve('ts-loader')
                        }
                    ]
                },
                {
                    test: /\.js|jsx$/,
                    include: /powerbi-visuals-utils-|src|precompile\\visualPlugin.ts/,
                    use: [
                        {
                            loader: require.resolve('babel-loader'),
                            options: babelOptions
                        }
                    ]
                },
            );
        } else {
            this.webpackConfig.module.rules.push(
                {
                    test: /\.(ts)x?$/,
                    use: require.resolve('ts-loader'),
                    exclude: /node_modules/
                }
            );
        }
    }

    async prepareWebPackConfig(visualPackage, options, tsconfig) {
        this.webpackConfig = require('./webpack.config');
        if (options.minifyJS) {
            this.enableOptimization();
        }
        await this.appendPlugins(options, visualPackage, tsconfig);
        await this.configureDevServer(visualPackage);
        await this.configureVisualPlugin(tsconfig, visualPackage);
        this.configureLoaders(options.target);

        return this.webpackConfig;
    }

    static async assemblyExternalJSFiles(visualPackage, minifyJS, tsOutFile) {
        let externalJSFilesContent = "";
        let externalJSFilesPath = path.join(visualPackage.basePath, config.build.precompileFolder, "externalJS.js");
        if (this.pbiviz.externalJS) {
            for (let file in this.pbiviz.externalJS) {
                let fileContent = fs.readFileSync(visualPackage.buildPath(this.pbiviz.externalJS[file]), encoding);
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

    async applyWebpackConfig(visualPackage, options = {
        devMode: false,
        generateResources: false,
        generatePbiviz: false,
        minifyJS: true,
        minify: true,
        target: "es5"
    }) {
        const tsconfigPath = visualPackage.buildPath('tsconfig.json');
        const tsconfig = require(tsconfigPath);

        this.pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
        this.pbiviz = require(this.pbivizJsonPath);

        const capabliliesPath = this.pbiviz.capabilities;
        const capabliliesFile = require(path.join(process.cwd(), capabliliesPath));
        visualPackage.config.capabilities = capabliliesFile;

        const dependenciesPath = this.pbiviz.dependencies && path.join(process.cwd(), this.pbiviz.dependencies);
        const dependenciesFile = fs.existsSync(dependenciesPath) && require(dependenciesPath);
        visualPackage.config.dependencies = dependenciesFile || {};

        await WebPackGenerator.prepareFolders(visualPackage);

        let webpackConfig;
        // new style
        if (tsconfig.compilerOptions.outDir) {
            // check apiVersion in package.json and installed version
            webpackConfig = await this.prepareWebPackConfig(visualPackage, options, tsconfig);
            // old style
        } else {
            ConsoleWriter.warn("For better development experience, we strongly recommend converting the visual to es2015 modules");
            ConsoleWriter.warn("https://microsoft.github.io/PowerBI-visuals/docs/latest/how-to-guide/migrating-to-powerbi-visuals-tools-3-0");
            let pluginDropPath = await TypescriptCompiler
                .createPlugin(
                    visualPackage,
                    `${this.pbiviz.visual.guid}${options.devMode ? "_DEBUG" : ""}`
                );
            tsconfig.files.push(pluginDropPath);

            await TypescriptCompiler.runWatcher(tsconfig.files, tsconfig.compilerOptions, !options.devMode, visualPackage);
            await TypescriptCompiler.concatExternalJS(visualPackage);
            // await WebPackGenerator.assemblyExternalJSFiles(visualPackage, options.minifyJS, tsconfig.compilerOptions.out);
            await LessCompiler.build(visualPackage, options);
            await TypescriptCompiler.appendExportPowerBINameSpace(visualPackage, tsconfig.compilerOptions);
            webpackConfig = await this.prepareWebPackConfig(visualPackage, options, tsconfig);
        }
        return webpackConfig;
    }
}

module.exports = WebPackGenerator;

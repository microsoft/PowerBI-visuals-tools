"use strict";

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const webpack = require('webpack');
const config = require('../config.json');
const PowerBICustomVisualsWebpackPlugin = require('powerbi-visuals-webpack-plugin');
const encoding = "utf8";
const ConsoleWriter = require('../lib/ConsoleWriter');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
const Visualizer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const CertificateTools = require("../lib/CertificateTools");
const visualPlugin = "visualPlugin.ts";
const lodashCloneDeep = require('lodash.clonedeep');
const npmPackage = require('../package.json');

class WebPackGenerator {

    static async prepareFoldersAndFiles(visualPackage) {
        let tmpFolder = path.join(visualPackage.basePath, ".tmp");
        let precompileFolder = path.join(visualPackage.basePath, config.build.precompileFolder);
        let dropFolder = path.join(visualPackage.basePath, config.build.dropFolder);
        let packgeDropFolder = path.join(visualPackage.basePath, config.package.dropFolder);
        let visualPluginFile = path.join(visualPackage.basePath, config.build.precompileFolder, visualPlugin);
        await fs.ensureDir(tmpFolder);
        await fs.ensureDir(precompileFolder);
        await fs.ensureDir(dropFolder);
        await fs.ensureDir(packgeDropFolder);
        await fs.createFile(visualPluginFile);
    }

    static loadAPIPackage() {
        try {
            let basePath = require.resolve("powerbi-visuals-api", {
                paths: [process.cwd()]
            });
            return require(basePath);
        } catch (ex) {
            return null;
        }
    }

    async installAPIpackage() {
        let apiVersion = this.pbiviz.apiVersion ? `~${this.pbiviz.apiVersion}` : "latest";
        try {
            ConsoleWriter.info(`Installing API: ${apiVersion}...`);
            let {
                stdout,
                stderr
            } = await exec(`npm install --save powerbi-visuals-api@${apiVersion}`);
            ConsoleWriter.info(stdout);
            ConsoleWriter.warn(stderr);
            return true;
        } catch (ex) {
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

    async configureDevServer(visualPackage, port = 8080) {
        let options = await CertificateTools.resolveCertificate();

        this.webpackConfig.devServer = {
            ...this.webpackConfig.devServer,
            hot: false,
            port: port || config.server.port,
            static: {
                directory: path.join(visualPackage.basePath, config.build.dropFolder),
                publicPath: config.server.assetsRoute
            },
            server: {
                type: 'https',
                options: {
                    key: options.key,
                    cert: options.cert,
                    pfx: options.pfx,
                    passphrase: options.passphrase
                }
            }
        };
    }

    configureVisualPlugin(options, tsconfig, visualPackage) {
        const visualJSFilePath = visualPackage.buildPath(tsconfig.compilerOptions.out || tsconfig.compilerOptions.outDir);
        this.webpackConfig.output.path = path.join(visualPackage.basePath, config.build.dropFolder);
        this.webpackConfig.output.filename = "[name]";
        let visualPluginPath = path.join(process.cwd(), config.build.precompileFolder, visualPlugin);
        this.webpackConfig.plugins.push(
            new webpack.WatchIgnorePlugin({ paths: [visualPluginPath] })
        );
        if (tsconfig.compilerOptions.out) {
            this.webpackConfig.entry = {
                "visual.js": visualJSFilePath
            };
        } else {
            this.webpackConfig.entry["visual.js"] = [visualPluginPath];
            this.webpackConfig.output.library = `${this.pbiviz.visual.guid}${options.devMode ? "_DEBUG" : ""}`;
            this.webpackConfig.output.libraryTarget = 'var';
        }
    }

    async getEnvironmentDetails() {
        let env = {};
        env.nodeVersion = process.versions.node;
        env.osPlatform = await os.platform();
        env.osVersion = await os.version ? os.version() : "undefined";
        env.osReleaseVersion = await os.release();
        env.toolsVersion = npmPackage.version;
        return env;
    }

    async configureCustomVisualsWebpackPlugin(visualPackage, options, tsconfig) {
        let pluginConfiguration = lodashCloneDeep(visualPackage.config);
        //(?=\D*$) - positive look-ahead to find last version symbols and exclude any non-digit symbols after the version.
        let regexFullVersion = /(?:\d+\.?){1,3}(?=\D*$)/;
        let regexMinorVersion = /\d+(?:\.\d+)?/;
        let apiVersionInstalled;
        try {
            apiVersionInstalled = (await exec('npm list powerbi-visuals-api version')).stdout.match(regexFullVersion)[0];
        } catch (err) {
            ConsoleWriter.warn(`"powerbi-visuals-api" is not installed`);
        }
        // if the powerbi-visual-api package wasn't installed
        // install the powerbi-visual-api, with version from apiVersion in pbiviz.json
        // or the latest API, if apiVersion is absent in pbiviz.json
        if (!apiVersionInstalled || (typeof this.pbiviz.apiVersion !== "undefined" && this.pbiviz.apiVersion.match(regexMinorVersion)[0] != apiVersionInstalled.match(regexMinorVersion)[0])) {
            ConsoleWriter.warn(`installed "powerbi-visuals-api" version - "${apiVersionInstalled}", is not match with the version specified in pbviz.json - "${this.pbiviz.apiVersion}".`);
            await this.installAPIpackage();
        }

        // pluginConfiguration.env = await this.getEnvironmentDetails();

        let api = WebPackGenerator.loadAPIPackage(visualPackage);
        pluginConfiguration.apiVersion = api.version;
        pluginConfiguration.capabilitiesSchema = api.schemas.capabilities;
        pluginConfiguration.pbivizSchema = api.schemas.pbiviz;
        pluginConfiguration.stringResourcesSchema = api.schemas.stringResources;
        pluginConfiguration.dependenciesSchema = api.schemas.dependencies;


        pluginConfiguration.customVisualID = `CustomVisual_${this.pbiviz.visual.guid}`.replace(/[^\w\s]/gi, '');
        pluginConfiguration.devMode = (typeof options.devMode === "undefined") ? true : options.devMode;
        pluginConfiguration.generatePbiviz = options.generatePbiviz;
        pluginConfiguration.generateResources = options.generateResources;
        pluginConfiguration.minifyJS = options.minifyJS;
        const dependenciesPath = this.pbiviz.dependencies && path.join(process.cwd(), this.pbiviz.dependencies);
        pluginConfiguration.dependencies = fs.existsSync(dependenciesPath) ? this.pbiviz.dependencies : null;
        pluginConfiguration.modules = typeof tsconfig.compilerOptions.outDir !== "undefined";
        pluginConfiguration.visualSourceLocation = path.posix.relative(config.build.precompileFolder, tsconfig.files[0]).replace(/(\.ts)x|\.ts/, "");
        pluginConfiguration.pluginLocation = path.join(config.build.precompileFolder, "visualPlugin.ts");
        pluginConfiguration.compression = options.compression;
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
                reportFilename: path.join(statsLocation, statsFilename),
                openAnalyzer: false,
                analyzerMode: `static`
            }),
            new PowerBICustomVisualsWebpackPlugin(pluginConfiguration),
            new ExtraWatchWebpackPlugin({
                files: [visualPackage.buildPath(this.pbiviz.capabilities)]
            }),
            new webpack.ProvidePlugin({
                window: 'realWindow',
                define: 'fakeDefine',
                powerbi: 'globalPowerbi'
            })
        );

        if (options.devtool === "source-map" && this.webpackConfig.devServer.port) {
            this.webpackConfig.plugins.push(
                new webpack.SourceMapDevToolPlugin({
                    filename: '[file].map',
                    publicPath: `https://localhost:${this.webpackConfig.devServer.port}/assets/`
                })
            );
        }
    }

    useLoader({
        fast = false
    }) {
        let tsOptions = {};
        if (fast) {
            tsOptions = {
                transpileOnly: false,
                experimentalWatchApi: false
            };
        }
        this.webpackConfig.module.rules.push({
            test: /(\.ts)x?$/,
            use: [
                {
                    loader: require.resolve('ts-loader'),
                    options: tsOptions
                }
            ]
        });
    }

    async prepareWebPackConfig(visualPackage, options, tsconfig) {
        this.webpackConfig = require('./webpack.config');
        if (options.minifyJS) {
            this.enableOptimization();
        }

        if (options.devtool) {
            this.webpackConfig.devtool = options.devtool;
        }

        await this.appendPlugins(options, visualPackage, tsconfig);
        await this.configureDevServer(visualPackage, options.devServerPort);
        await this.configureVisualPlugin(options, tsconfig, visualPackage);
        this.useLoader({
            fast: options.fast
        });

        return this.webpackConfig;
    }

    async assemblyExternalJSFiles(visualPackage) {
        let externalJSFilesContent = "";
        let externalJSFilesPath = path.join(visualPackage.basePath, config.build.precompileFolder, "externalJS.js");
        await fs.writeFile(
            externalJSFilesPath,
            externalJSFilesContent, {
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
        devServerPort: 8080,
        fast: false,
        compression: 0
    }) {
        const tsconfigPath = visualPackage.buildPath('tsconfig.json');
        const tsconfig = require(tsconfigPath);

        this.pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
        this.pbiviz = require(this.pbivizJsonPath);

        const capabliliesPath = this.pbiviz.capabilities;
        visualPackage.config.capabilities = capabliliesPath;

        const dependenciesPath = this.pbiviz.dependencies && path.join(process.cwd(), this.pbiviz.dependencies);
        const dependenciesFile = fs.existsSync(dependenciesPath) && require(dependenciesPath);
        visualPackage.config.dependencies = typeof dependenciesFile === 'object' ? dependenciesFile : {};

        await WebPackGenerator.prepareFoldersAndFiles(visualPackage);

        let webpackConfig = await this.prepareWebPackConfig(visualPackage, options, tsconfig);

        return { webpackConfig };
    }
}

module.exports = WebPackGenerator;

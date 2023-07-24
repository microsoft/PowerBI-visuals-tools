"use strict";

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import webpack from 'webpack';
import util from 'util';
const exec = util.promisify(processExec);
import { exec as processExec } from 'child_process';
import lodashCloneDeep from 'lodash.clonedeep';
import ExtraWatchWebpackPlugin from 'extra-watch-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { PowerBICustomVisualsWebpackPlugin } from 'powerbi-visuals-webpack-plugin';
import ConsoleWriter from './ConsoleWriter.js';
import { resolveCertificate } from "./CertificateTools.js";
import { getRootPath, readJsonFromRoot, readJsonFromVisual } from './utils.js'

const config = readJsonFromRoot('config.json');
const npmPackage = readJsonFromRoot('package.json');

const visualPlugin = "visualPlugin.ts";
const encoding = "utf8";

export interface WebpackOptions {
    devMode: boolean;
    generateResources: boolean;
    generatePbiviz: boolean;
    minifyJS: boolean;
    minify: boolean;
    stats: boolean;
    compression?: number;
    devtool?: string;
    devServerPort?: number;
    fast?: boolean;
}

export default class WebPackWrap {
    private pbiviz;
    private webpackConfig;

    static async prepareFoldersAndFiles(visualPackage) {
        const tmpFolder = path.join(visualPackage.basePath, ".tmp");
        const precompileFolder = path.join(visualPackage.basePath, config.build.precompileFolder);
        const dropFolder = path.join(visualPackage.basePath, config.build.dropFolder);
        const packageDropFolder = path.join(visualPackage.basePath, config.package.dropFolder);
        const visualPluginFile = path.join(visualPackage.basePath, config.build.precompileFolder, visualPlugin);
        await fs.ensureDir(tmpFolder);
        await fs.ensureDir(precompileFolder);
        await fs.ensureDir(dropFolder);
        await fs.ensureDir(packageDropFolder);
        await fs.createFile(visualPluginFile);
    }

    static loadAPIPackage() {
        try {
            return import("file://" + path.join(process.cwd(), "node_modules", "powerbi-visuals-api", "index.js"));
        } catch (ex) {
            return null;
        }
    }

    async installAPIpackage() {
        const apiVersion = this.pbiviz.apiVersion ? `~${this.pbiviz.apiVersion}` : "latest";
        try {
            ConsoleWriter.info(`Installing API: ${apiVersion}...`);
            const {
                stdout,
                stderr
            } = await exec(`npm install --save powerbi-visuals-api@${apiVersion}`);
            if (stdout) ConsoleWriter.info(stdout);
            if (stderr) ConsoleWriter.warning(stderr);
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
        const options = await resolveCertificate();

        this.webpackConfig.devServer = {
            ...this.webpackConfig.devServer,
            hot: false,
            port,
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
        const visualJSFilePath = tsconfig.compilerOptions.out || tsconfig.compilerOptions.outDir;
        this.webpackConfig.output.path = path.join(visualPackage.basePath, config.build.dropFolder);
        this.webpackConfig.output.filename = "[name]";
        const visualPluginPath = path.join(process.cwd(), config.build.precompileFolder, visualPlugin);
        this.webpackConfig.watchOptions.ignored.push(visualPluginPath)
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
        const env = {
            nodeVersion: process.versions.node,
            osPlatform: await os.platform(),
            osVersion: await os.version ?? "undefined",
            osReleaseVersion: await os.release(),
            toolsVersion: npmPackage.version
        };
        return env;
    }

    async configureCustomVisualsWebpackPlugin(visualPackage, options, tsconfig) {
        const pluginConfiguration = lodashCloneDeep(visualPackage.pbivizConfig);
        //(?=\D*$) - positive look-ahead to find last version symbols and exclude any non-digit symbols after the version.
        const regexFullVersion = /(?:\d+\.?){1,3}(?=\D*$)/;
        const regexMinorVersion = /\d+(?:\.\d+)?/;
        let apiVersionInstalled;
        try {
            const subprocess = await exec('npm list powerbi-visuals-api version')
            apiVersionInstalled = subprocess.stdout.match(regexFullVersion)[0];
        } catch (err) {
            ConsoleWriter.warning(`"powerbi-visuals-api" is not installed`);
        }
        // if the powerbi-visual-api package wasn't installed
        // install the powerbi-visual-api, with version from apiVersion in pbiviz.json
        // or the latest API, if apiVersion is absent in pbiviz.json
        if (!apiVersionInstalled || !this.pbiviz.apiVersion || this.pbiviz.apiVersion.match(regexMinorVersion)[0] != apiVersionInstalled.match(regexMinorVersion)[0]) {
            ConsoleWriter.warning(`installed "powerbi-visuals-api" version - "${apiVersionInstalled}", is not match with the version specified in pbviz.json - "${this.pbiviz.apiVersion}".`);
            await this.installAPIpackage();
        }

        // pluginConfiguration.env = await this.getEnvironmentDetails();

        const api = await WebPackWrap.loadAPIPackage();
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
        const pluginConfiguration = await this.configureCustomVisualsWebpackPlugin(visualPackage, options, tsconfig);

        let statsFilename = config.build.stats.split("/").pop();
        const statsLocation = config.build.stats.split("/").slice(0, -1).join(path.sep);
        statsFilename = statsFilename?.split(".").slice(0, -1).join(".");
        statsFilename = `${statsFilename}.${options.devMode ? "dev" : "prod"}.html`;

        if (options.stats) {
            this.webpackConfig.plugins.push(
                new BundleAnalyzerPlugin({
                    reportFilename: path.join(statsLocation, statsFilename),
                    openAnalyzer: false,
                    analyzerMode: `static`
                })
            );
        }
        this.webpackConfig.plugins.push(
            new PowerBICustomVisualsWebpackPlugin(pluginConfiguration),
            new ExtraWatchWebpackPlugin({
                files: this.pbiviz.capabilities
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

    async useLoader({
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
                    loader: path.resolve(getRootPath(), "node_modules", "ts-loader"),
                    options: tsOptions
                }
            ]
        });
    }

    async prepareWebPackConfig(visualPackage, options: WebpackOptions, tsconfig) {
        this.webpackConfig = Object.assign({}, await import('./webpack.config.js')).default;
        if (options.minifyJS) {
            this.enableOptimization();
        }

        if (options.devtool) {
            this.webpackConfig.devtool = options.devtool;
        }

        await this.appendPlugins(options, visualPackage, tsconfig);
        await this.configureDevServer(visualPackage, options.devServerPort);
        await this.configureVisualPlugin(options, tsconfig, visualPackage);
        await this.useLoader({
            fast: options.fast
        });

        return this.webpackConfig;
    }

    async assemblyExternalJSFiles(visualPackage) {
        const externalJSFilesContent = "";
        const externalJSFilesPath = path.join(visualPackage.basePath, config.build.precompileFolder, "externalJS.js");
        await fs.writeFile(
            externalJSFilesPath,
            externalJSFilesContent, {
            encoding: encoding
        });

        return externalJSFilesPath;
    }

    async generateWebpackConfig(visualPackage, options: WebpackOptions = {
        devMode: false,
        generateResources: false,
        generatePbiviz: false,
        minifyJS: true,
        minify: true,
        devServerPort: 8080,
        fast: false,
        compression: 0,
        stats: true
    }) {
        const tsconfig = readJsonFromVisual('tsconfig.json');
        this.pbiviz = readJsonFromVisual('pbiviz.json');

        const capabilitiesPath = this.pbiviz.capabilities;
        visualPackage.pbivizConfig.capabilities = capabilitiesPath;

        const dependenciesPath = this.pbiviz.dependencies && path.join(process.cwd(), this.pbiviz.dependencies);
        const dependenciesFile = fs.existsSync(dependenciesPath) && JSON.parse(fs.readFileSync(dependenciesPath));
        visualPackage.pbivizConfig.dependencies = typeof dependenciesFile === 'object' ? dependenciesFile : {};

        await WebPackWrap.prepareFoldersAndFiles(visualPackage);

        const webpackConfig = await this.prepareWebPackConfig(visualPackage, options, tsconfig);

        return webpackConfig;
    }
}

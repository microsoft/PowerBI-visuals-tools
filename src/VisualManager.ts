/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import webpack, { Compiler, Stats } from "webpack";
import WebpackDevServer from "webpack-dev-server";
import childProcess from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { ESLint } from "eslint";

import ConsoleWriter from './ConsoleWriter.js';
import VisualGenerator from './VisualGenerator.js';
import { getRootPath, readJsonFromRoot, readJsonFromVisual } from './utils.js';
import WebpackWrap, { WebpackOptions } from './WebPackWrap.js';
import Package from './Package.js';
import { Visual } from "./Visual.js";
import { FeatureManager, Logs, Status } from "./FeatureManager.js";
import { Severity, Stage } from "./features/FeatureTypes.js";
import TemplateFetcher from "./TemplateFetcher.js";

export interface GenerateOptions {
    force: boolean;
    template: string;
}

export interface LintOptions {
    verbose: boolean;
    fix: boolean;
    lintPath?: string;
}

const globalConfig = readJsonFromRoot('config.json');
const PBIVIZ_FILE = 'pbiviz.json';

/**
 * Represents an instance of a visual package based on file path
 */
export default class VisualManager {
    public basePath: string;
    public pbivizConfig;
    private capabilities;
    private webpackConfig;
    private visual: Visual;
    private package: Package;
    private featureManager: FeatureManager;
    private compiler: Compiler;
    private webpackDevServer: WebpackDevServer;

    constructor(rootPath: string) {
        this.basePath = rootPath;
    }

    public prepareVisual() {
        if (this.doesPBIVIZExists()) {
            this.pbivizConfig = readJsonFromVisual(PBIVIZ_FILE, this.basePath);
            this.createVisualInstance();
        } else {
            ConsoleWriter.error(PBIVIZ_FILE + ' not found. You must be in the root of a visual project to run this command.')
            process.exit(1);
        }
        return this;
    }

    public createVisualInstance() {
        this.capabilities = readJsonFromVisual("capabilities.json", this.basePath);
        const packageJSON = readJsonFromVisual("package.json", this.basePath);
        this.visual = new Visual(this.capabilities, this.pbivizConfig, packageJSON);
    }

    public async initializeWebpack(webpackOptions: WebpackOptions) {
        const webpackWrap = new WebpackWrap();
        this.webpackConfig = await webpackWrap.generateWebpackConfig(this, webpackOptions)

        this.compiler = webpack(this.webpackConfig);

        return this;
    }

    public generatePackage(verbose: boolean = false) {
        const callback = (err: Error, stats: Stats) => {
            this.parseCompilationResults(err, stats);
            this.createPackageInstance();
            const logs = this.validatePackage();
            this.outputResults(logs, verbose);
        }
        this.compiler.run(callback);
    }

    /**
     * Starts webpack server
     */
    public startWebpackServer(generateDropFiles: boolean = false) {
        ConsoleWriter.blank();
        ConsoleWriter.info('Starting server...');
        try {
            if (generateDropFiles) {
                this.prepareDropFiles();
            }

            this.webpackDevServer = new WebpackDevServer({
                ...this.webpackConfig.devServer,
                client: false,
                hot: false,
                devMiddleware: {
                    writeToDisk: true    
                }
            }, this.compiler);

            (async () => {
                await this.webpackDevServer.start();
                ConsoleWriter.info(`Server listening on port ${this.webpackConfig.devServer.port}`);
            })();

            process.on('SIGINT', this.stopServer);
            process.on('SIGTERM', this.stopServer);
        } catch (e) {
            ConsoleWriter.error(e.message);
            process.exit(1);
        }
    }

    /**
     * Validates the visual code
     */
    public validateVisual(verbose: boolean = false) {
        this.featureManager = new FeatureManager()
        const { status, logs } = this.featureManager.validate(Stage.PreBuild, this.visual);
        this.outputResults(logs, verbose);
        if(status === Status.Error){
            process.exit(1);
        }

        return this;
    }
    
    /**
     * Validates the visual package
     */
    public validatePackage() {
        const featureManager = new FeatureManager();
        const { logs } = featureManager.validate(Stage.PostBuild, this.package);

        return logs;
    }

    /**
     * Outputs the results of the validation 
     */
    public outputResults({ errors, deprecation, warnings, info }: Logs, verbose: boolean) {
        const headerMessage = {
            error: `Visual doesn't support some features required for all custom visuals:`,
            deprecation: `Some features are going to be required soon, please update the visual:`,
            warning: `Visual doesn't support some features recommended for all custom visuals:`,
            verboseInfo: `Visual can be improved by adding some features:`,
            shortInfo: `Visual can be improved by adding ${info.length} more optional features.`
        };

        this.outputLogsWithHeadMessage(headerMessage.error, errors, Severity.Error);
        this.outputLogsWithHeadMessage(headerMessage.deprecation, deprecation, Severity.Deprecation);
        this.outputLogsWithHeadMessage(headerMessage.warning, warnings, Severity.Warning);

        const verboseSuggestion = 'Run `pbiviz package` with --verbose flag to see more details.';
        const headerInfoMessage = headerMessage[verbose ? "verboseInfo" : "shortInfo"]
        const infoLogs = (!info.length || verbose) ? info : [verboseSuggestion];
        this.outputLogsWithHeadMessage(headerInfoMessage, infoLogs, Severity.Info);
    }
    
    /**
     * Displays visual info
     */
    public displayInfo() {
        if (this.pbivizConfig) {
            ConsoleWriter.infoTable(this.pbivizConfig);
        } else {
            ConsoleWriter.error('Unable to load visual info. Please ensure the package is valid.');
        }
    }

    /**
     * Runs eslint validation in the visual folder
     */
    public async runLintValidation({ verbose, fix, lintPath }: LintOptions) {
        ConsoleWriter.info("Running eslint check...");
        const rootPath = getRootPath();
        const visualCodePath = `${process.cwd()}`;
        const config: ESLint.Options = {
            overrideConfig: {
                env: {
                    browser: true,
                    es6: true,
                    es2022: true
                },
                plugins: [
                    "powerbi-visuals"
                ],
                extends: [
                    "plugin:powerbi-visuals/recommended"
                ]
            },
            extensions: [".ts", ".tsx"],
            resolvePluginsRelativeTo: rootPath,
            fix
        }
        const eslint = new ESLint(config);
        const lintPathPath = lintPath.split(',').map(el => path.join(visualCodePath, ...el.split('/')));
        const results = await eslint.lintPath(lintPathPath);
        if (fix) {
            ConsoleWriter.info("Eslint fixing errors...");
            await ESLint.outputFixes(results);
        }
        if (verbose) {
            const formatter = await eslint.loadFormatter("stylish");
            const formattedResults = await formatter.format(results);
            console.log(formattedResults)
        } else {
            const filteredResults = ESLint.getErrorResults(results);
            // get total amount of errors and warnings in all elements of filteredResults
            const totalErrors = filteredResults.reduce((acc, curr) => acc + curr.errorCount, 0);
            const totalWarnings = filteredResults.reduce((acc, curr) => acc + curr.warningCount, 0);
            if(totalErrors > 0 || totalWarnings > 0) {
                ConsoleWriter.error(`Linter found ${totalErrors} errors and ${totalWarnings} warnings. Run with --verbose flag to see details.`)
                process.exit(1)
            }
        }   
        ConsoleWriter.info("Eslint check completed.");
    }

    /**
     * Creates a new visual
     */
    static async createVisual(rootPath: string, visualName: string, generateOptions: GenerateOptions): Promise<VisualManager | void> {
        ConsoleWriter.info('Creating new visual');
        if (generateOptions.force) {
            ConsoleWriter.warning('Running with force flag. Existing files will be overwritten');
        }

        try {
            const config = readJsonFromRoot('config.json');
            if(config.visualTemplates[generateOptions.template]){
                new TemplateFetcher( generateOptions.template, visualName, undefined )
                    .fetch();
                return;
            }
            const newVisualPath = await VisualGenerator.generateVisual(rootPath, visualName, generateOptions)
            await VisualManager.installPackages(newVisualPath).then(() => ConsoleWriter.done('Visual creation complete'))

            return new VisualManager(newVisualPath);
        } catch (error) {
            ConsoleWriter.error(['Unable to create visual.\n', error]);
            process.exit(1);
        }
    }

    /**
     * Install npm dependencies for visual
     */
    static installPackages(visualPath: string): Promise<void> {
        return new Promise(function (resolve, reject) {
            ConsoleWriter.info('Installing packages...');
            childProcess.exec(`npm install`, { cwd: visualPath },
                (err) => {
                    if (err) {
                        reject(new Error('Package install failed.'));
                    } else {
                        ConsoleWriter.info('Installed packages.');
                        resolve();
                    }
                });
        });
    }
    
    private doesPBIVIZExists() {
        return fs.existsSync(PBIVIZ_FILE);
    }

    private prepareDropFiles() {
        this.webpackConfig.devServer.onBeforeSetupMiddleware = (devServer) => {
            const { headers, publicPath, static: { directory } } = this.webpackConfig.devServer;
            const assets = [ 'visual.js`', 'visual.css', 'pbiviz.json' ]

            const setHeaders = (res) => {
                Object.getOwnPropertyNames(headers)
                    .forEach(property => res.header(property, headers[property]));
            };
            const readFile = (file, res) => {
                fs.readFile(file).then(function (content) {
                    res.write(content);
                    res.end();
                });
            };

            assets.forEach(asset => {
                devServer.app.get(`${publicPath}/${asset}`, function (req, res) {
                    setHeaders(res);
                    readFile(path.join(directory, asset), res);
                });
            });
        };
    }

    private stopServer() {
        ConsoleWriter.blank();
        ConsoleWriter.info("Stopping server...");
        if (this.webpackDevServer) {
            this.webpackDevServer.close();
            this.webpackDevServer = null;
        }
    }

    private createPackageInstance() {
        const pathToJSContent = path.join((this.pbivizConfig.build ?? globalConfig.build).dropFolder, "visual.js");
        const sourceCode = fs.readFileSync(pathToJSContent, "utf8");
        this.package = new Package(sourceCode, this.capabilities, this.visual.visualFeatureType);
    }

    private parseCompilationResults(err: Error, stats: Stats) {
        ConsoleWriter.blank();
        if (err) {
            ConsoleWriter.error(`Package wasn't created. ${JSON.stringify(err)}`);
        }
        if (stats?.compilation.errors.length) {
            stats.compilation.errors.forEach(error => ConsoleWriter.error(error.message));
            ConsoleWriter.error(`Package wasn't created. ${stats.compilation.errors.length} errors found.`);
        }
        if (!err && !stats?.compilation.errors.length) {
            ConsoleWriter.done('Build completed successfully');
        } else {
            process.exit(1);
        }
    }

    private outputLogsWithHeadMessage(headMessage: string, logs: string[], severity: Severity) {
        if(!logs.length) {
            return;
        }
        let outputLog;
        switch(severity) {
            case Severity.Deprecation:
            case Severity.Error:
                outputLog = ConsoleWriter.error;
                break;
            case Severity.Warning:
                outputLog = ConsoleWriter.warning;
                break;
            default:
                outputLog = ConsoleWriter.info;
                break;
        }

        if(headMessage) {
            outputLog(headMessage);
            ConsoleWriter.blank();
        }

        logs.forEach(error => outputLog(error));
        ConsoleWriter.blank();
    }
}

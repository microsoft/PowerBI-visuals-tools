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

import webpack, { Configuration, Stats } from "webpack";
import childProcess from 'child_process';
import fs from 'fs-extra';
import path from 'path';

import ConsoleWriter from './ConsoleWriter.js';
import VisualGenerator from './VisualGenerator.js';
import { readJsonFromRoot, readJsonFromVisual } from './utils.js';
import WebpackWrap, { WebpackOptions } from './WebPackWrap.js';
import Package from './Package.js';
import { Visual } from "./Visual.js";
import { FeatureManager, Logs } from "./FeatureManager.js";
import { Stage } from "./Features/FeatureTypes.js";

const globalConfig = readJsonFromRoot('config.json');
const PBIVIZ_FILE = 'pbiviz.json';

/**
 * Represents an instance of a visual package based on file path
 */
export default class VisualManager {
    public config;
    public capabilities;
    public basePath: string;
    public webpackConfig: Configuration;
    public visual: Visual;
    public package: Package;
    public featureManager: FeatureManager;

    /**
     * Creates a VisualPackage instance
     * 
     * @param {string} rootPath - file path to root of visual package
     */
    constructor(rootPath: string) {
        if(this.doesPBIVIZExists()) {
            this.basePath = rootPath;
            this.config = readJsonFromVisual(PBIVIZ_FILE);
            this.capabilities = readJsonFromVisual("capabilities.json");
            const packageJSON = readJsonFromVisual("package.json");
            this.visual = new Visual(this.capabilities, this.config, packageJSON);
        } else {
            new Error(PBIVIZ_FILE + ' not found. You must be in the root of a visual project to run this command.')
        }
    }

    public doesPBIVIZExists() {
        return fs.existsSync(PBIVIZ_FILE);
    }

    public validateVisualCode() {
        this.featureManager = new FeatureManager()
        const { ok, logs } = this.featureManager.validate(Stage.PreBuild, this.visual);
        this.outputResults(logs);
        if(!ok){
            process.exit(1);
        }

        return this;
    }
    
    public validatePackage() {
        const featureManager = new FeatureManager();
        const { logs } = featureManager.validate(Stage.PostBuild, this.package);

        return logs;
    }

    public outputResults({ errors, deprecation, warnings, info }: Logs) {
        const featuresTotalLog = {
            errors: `Visual doesn't support some features required for all custom visuals:`,
            deprecation: `Some features are going to be required soon, please update the visual:`,
            warn: `Visual doesn't support some features recommended for all custom visuals:`,
            info: `Visual can be improved by adding some features:`
        };
        this.outputErrors(featuresTotalLog.errors, errors);
        this.outputErrors(featuresTotalLog.deprecation, deprecation);
        this.outputWarningLogs(featuresTotalLog.warn, warnings);
        this.outputInfoLogs(featuresTotalLog.info, info);
    }

    public async generatePackage(webpackOptions: WebpackOptions) {
        const webpackWrap = new WebpackWrap();
        this.webpackConfig = await webpackWrap.generateWebpackConfig(this, webpackOptions)

        const compiler = webpack(this.webpackConfig);
        compiler.run((err: Error, stats: Stats) => {
            this.parseCompilationResultsCallback(err, stats)
            this.createPackageInstance();
            const logs = this.validatePackage();
            this.outputResults(logs);
        });

        return this;
    }
    
    public displayInfo() {
        if (this.config) {
            ConsoleWriter.infoTable(this.config);
        } else {
            ConsoleWriter.error('Unable to load visual info. Please ensure the package is valid.');
        }
    }

    /**
     * Creates a new visual package
     * 
     * @param {string} rootPath - file path to root of visual package
     * @param {string} visualName - name of the visual to create in the rootPath
     * @param {object} generateOptions - options for the visual generator
     * <VisualPackage>} - instance of newly created visual package
     */
    static createVisual(rootPath: string, visualName: string, generateOptions: object) {
        return VisualGenerator.generate(rootPath, visualName, generateOptions)
            .then((visualPath: string) => VisualManager.installPackages(visualPath).then(() => visualPath))
            .then((visualPath) => new VisualManager(visualPath));
    }

    /**
     * Install npm dependencies for visual
     * @param {string} rootPath - file path to root of visual package
     * @static
     * @returns {Promise<void>}
     * @memberof VisualPackage
     */
    static installPackages(visualPath: string) {
        return new Promise(function (resolve, reject) {
            ConsoleWriter.info('Installing packages...');
            childProcess.exec(`npm install`, { cwd: visualPath },
                (err) => {
                    if (err) {
                        reject(new Error('Package install failed.'));
                    } else {
                        ConsoleWriter.info('Installed packages.');
                        resolve(true);
                    }
                });
        });
    }

    private createPackageInstance() {
        const pathToJSContent = path.join((this.config.build ?? globalConfig.build).dropFolder, "visual.js");
        this.package = new Package(pathToJSContent, this.capabilities, this.visual.visualType);
    }

    private parseCompilationResultsCallback(err: Error, stats: Stats) {
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
        }
    }

    private outputErrors(headMessage: string, errors: string[]) {
        if(!errors.length) {
            return;
        }
        if(headMessage) {
            ConsoleWriter.error(headMessage);
            ConsoleWriter.blank();
        }
        errors.forEach(error => ConsoleWriter.error(error));
        ConsoleWriter.blank();
    }
    
    private outputWarningLogs(headMessage: string, warnings: string[]) {
        if(!warnings.length) {
            return;
        }
        if(headMessage) {
            ConsoleWriter.warn(headMessage);
            ConsoleWriter.blank();
        }
        warnings.forEach(warn => ConsoleWriter.warn(warn));
        ConsoleWriter.blank();
    }
    
    private outputInfoLogs(headMessage: string, infoMessages: string[]) {
        if(!infoMessages.length) {
            return;
        }
        if(headMessage) {
            ConsoleWriter.info(headMessage);
            ConsoleWriter.blank();
        }
        infoMessages.forEach(info => ConsoleWriter.info(info));
        ConsoleWriter.blank();
    }
}

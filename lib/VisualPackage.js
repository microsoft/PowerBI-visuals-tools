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
import fs from 'fs-extra';
import ConsoleWriter from './ConsoleWriter.js';
import VisualGenerator from './VisualGenerator.js';
import childProcess from 'child_process';
import { readJsonFromVisual } from './utils.js';
import webpack from "webpack";
import featureAnalyzer from './VisualFeaturesPrecheck.js';
import WebpackWrap from './WebPackWrap.js';
import chalk from 'chalk';
const CONFIG_FILE = 'pbiviz.json';
/**
 * Represents an instance of a visual package based on file path
 */
export default class VisualPackage {
    basePath;
    config;
    webpackConfig;
    /**
     * Creates a VisualPackage instance
     *
     * @param {string} rootPath - file path to root of visual package
     */
    constructor(rootPath) {
        if (this.isInRootFolder()) {
            this.basePath = rootPath;
            this.config = readJsonFromVisual(CONFIG_FILE);
        }
        else {
            new Error(CONFIG_FILE + ' not found. You must be in the root of a visual project to run this command.');
        }
    }
    isInRootFolder() {
        return fs.existsSync(CONFIG_FILE);
    }
    preBuildValidation() {
        const errors = featureAnalyzer.preBuildCheck(this.config);
        if (errors.length) {
            ConsoleWriter.error(`Package wasn't created. ${errors.length} errors found before compilation`);
            errors.forEach(error => ConsoleWriter.error(error));
            process.exit(1);
        }
        return this;
    }
    async package(webpackOptions) {
        const webpackWrap = new WebpackWrap();
        this.webpackConfig = await webpackWrap.generateWebpackConfig(this, webpackOptions);
        const compiler = webpack(this.webpackConfig);
        compiler.run(this.parseCompilationResults);
        return this;
    }
    async postBuildValidation() {
        const featuresTotalLog = {
            deprecation: (count) => `${count} ${count > 1 ? "features" : "feature"} are going to be required soon, please update your visual:`,
            warn: (count) => `Your visual doesn't support ${count} ${count > 1 ? "features" : "feature"} recommended for all custom visuals:`,
            info: (count) => `Your visual can be improved by adding ${count} ${count > 1 ? "features" : "feature"}:`
        };
        const logs = await featureAnalyzer.unsupportedFeatureList(this.config);
        for (const [featureSeverity, logsArray] of Object.entries(logs)) {
            if (logsArray.length) {
                const totalLog = featuresTotalLog[featureSeverity](logsArray.length);
                ConsoleWriter.blank();
                ConsoleWriter[featureSeverity](totalLog);
                ConsoleWriter.blank();
                logsArray.forEach(log => ConsoleWriter[featureSeverity](chalk.bold(log)));
            }
        }
    }
    displayPackageInfo() {
        if (this.config) {
            ConsoleWriter.infoTable(this.config);
        }
        else {
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
    static createVisualPackage(rootPath, visualName, generateOptions) {
        return VisualGenerator.generate(rootPath, visualName, generateOptions)
            .then((visualPath) => VisualPackage.installPackages(visualPath)
            .then(() => visualPath))
            .then((visualPath) => new VisualPackage(visualPath));
    }
    /**
     * Install npm dependencies for visual
     * @param {string} rootPath - file path to root of visual package
     * @static
     * @returns {Promise<void>}
     * @memberof VisualPackage
     */
    static installPackages(visualPath) {
        return new Promise(function (resolve, reject) {
            ConsoleWriter.info('Installing packages...');
            childProcess.exec(`npm install`, { cwd: visualPath }, (err) => {
                if (err) {
                    reject(new Error('Package install failed.'));
                }
                else {
                    ConsoleWriter.info('Installed packages.');
                    resolve(true);
                }
            });
        });
    }
    parseCompilationResults(err, stats) {
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
}

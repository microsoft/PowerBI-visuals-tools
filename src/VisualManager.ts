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

import ConsoleWriter from './ConsoleWriter.js';
import VisualGenerator from './VisualGenerator.js';
import { readJsonFromRoot, readJsonFromVisual } from './utils.js';
import WebpackWrap, { WebpackOptions } from './WebPackWrap.js';
import TemplateFetcher from "./TemplateFetcher.js";

interface GenerateOptions {
    force: boolean;
    template: string;
}

const PBIVIZ_FILE = 'pbiviz.json';

/**
 * Represents an instance of a visual package based on file path
 */
export default class VisualManager {
    public basePath: string;
    public pbivizConfig;
    private webpackConfig;
    private compiler: Compiler;
    private webpackDevServer: WebpackDevServer;

    constructor(rootPath: string) {
            this.basePath = rootPath;
    }

    public prepareVisual() {
        if (this.doesPBIVIZExists()) {
            this.pbivizConfig = readJsonFromVisual(PBIVIZ_FILE, this.basePath);
        } else {
            throw new Error(PBIVIZ_FILE + ' not found. You must be in the root of a visual project to run this command.')
        }
        return this;
    }

    public doesPBIVIZExists() {
        return fs.existsSync(PBIVIZ_FILE);
    }

    public async initializeWebpack(webpackOptions: WebpackOptions) {
        const webpackWrap = new WebpackWrap();
        this.webpackConfig = await webpackWrap.generateWebpackConfig(this, webpackOptions)

        this.compiler = webpack(this.webpackConfig);

        return this;
    }

    public generatePackage() {
        const callback = (err: Error, stats: Stats) => {
            this.parseCompilationResults(err, stats)
        }
        this.compiler.run(callback);
    }

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

    public displayInfo() {
        if (this.pbivizConfig) {
            ConsoleWriter.infoTable(this.pbivizConfig);
        } else {
            ConsoleWriter.error('Unable to load visual info. Please ensure the package is valid.');
        }
    }

    /**
     * Creates a new visual package
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
        }
    }
}

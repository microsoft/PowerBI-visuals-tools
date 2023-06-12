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

import CommandHelpManager from '../lib/CommandHelpManager.js';
import ConsoleWriter from '../lib/ConsoleWriter.js';
import VisualPackage from '../lib/Visual.js';
import WebPackWrap from '../lib/WebPackWrap.js';
import  WebpackDevServer from "webpack-dev-server";
import  compareVersions from "compare-versions";
import fs from 'fs-extra';
import  path from 'path';
import  program from 'commander';
import { readJsonFromRoot } from '../lib/utils.js';
import  webpack from "webpack";

const config = readJsonFromRoot('config.json');

const options = process.argv;
const minAPIversion = config.constants.minAPIversion;

program
    .option('-p, --port [port]', 'set the port listening on')
    .option('-m, --mute', 'mute error outputs')
    .option('-d, --drop', 'drop outputs into output folder')
    .option('--no-stats', "Doesn't generate statistics files");

if (options.some(option => option === '--help' || option === '-h')) {
    program.help(CommandHelpManager.createSubCommandHelpCallback(options));
    process.exit(0);
}

program.parse(options);

let cwd = process.cwd();
let server;
new VisualPackage(cwd).then((visualPackage) => {
    if (visualPackage.config.apiVersion && compareVersions.compare(visualPackage.config.apiVersion, minAPIversion, "<")) {
        ConsoleWriter.error(`Can't start the visual because of the current API is '${visualPackage.config.apiVersion}'.
        Please use 'powerbi-visuals-api' ${minAPIversion} or above to build a visual.`);
        throw new Error(`Invalid API version.`);
    }
    new WebPackWrap().applyWebpackConfig(visualPackage, {
        devMode: true,
        devtool: "source-map",
        generateResources: true,
        generatePbiviz: false,
        minifyJS: false,
        minify: false,
        devServerPort: program.port,
        disableStats: !program.stats
    })
        .then(({ webpackConfig }) => {
            let compiler = webpack(webpackConfig);
            ConsoleWriter.blank();
            ConsoleWriter.info('Starting server...');
            // webpack dev server serves bundle from disk instead memory
            if (program.drop) {
                webpackConfig.devServer.onBeforeSetupMiddleware = (devServer) => {
                    let setHeaders = (res) => {
                        Object.getOwnPropertyNames(webpackConfig.devServer.headers)
                            .forEach(property => res.header(property, webpackConfig.devServer.headers[property]));
                    };
                    let readFile = (file, res) => {
                        fs.readFile(file).then(function (content) {
                            res.write(content);
                            res.end();
                        });
                    };
                    [
                        'visual.js`',
                        'visual.css',
                        'pbiviz.json'
                    ].forEach(asset => {
                        devServer.app.get(`${webpackConfig.devServer.publicPath}/${asset}`, function (req, res) {
                            setHeaders(res);
                            readFile(path.join(webpackConfig.devServer.static.directory, asset), res);
                        });
                    });
                };
            }

            server = new WebpackDevServer({
                ...webpackConfig.devServer,
                client: false,
                hot: false,
                devMiddleware: {
                    writeToDisk: true    
                }
            }, compiler);

            (async () => {
                await server.start();
                ConsoleWriter.info(`Server listening on port ${webpackConfig.devServer.port}`);
            })();

        })
        .catch(e => {
            ConsoleWriter.error(e.message);
            process.exit(1);
        });
}).catch(e => {
    ConsoleWriter.error('LOAD ERROR', e);
    process.exit(1);
});

//clean up
function stopServer() {
    ConsoleWriter.blank();
    ConsoleWriter.info("Stopping server...");
    if (server) {
        server.close();
        server = null;
    }
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);


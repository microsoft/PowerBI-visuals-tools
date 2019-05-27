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

const program = require('commander');
const VisualPackage = require('../lib/VisualPackage');
const WebpackDevServer = require("webpack-dev-server");
const ConsoleWriter = require('../lib/ConsoleWriter');
const WebPackWrap = require('../lib/WebPackWrap');
const webpack = require("webpack");
const CommandHelpManager = require('../lib/CommandHelpManager');
const fs = require('fs-extra');
const path = require('path');

let https = require('https');
let connect = require('connect');
let serveStatic = require('serve-static');

const options = process.argv;

program
    .option('-t, --target [target]', 'Enable babel loader to compile JS into ES5 standart')
    .option('-p, --port [port]', 'set the port listening on')
    .option('-m, --mute', 'mute error outputs')
    .option('-d, --drop', 'drop outputs into output folder');

for (let i = 0; i < options.length; i++) {
    if (options[i] == '--help' || options[i] == '-h') {
        program.help(CommandHelpManager.createSubCommandHelpCallback(options));
        process.exit(0);
    }
}

program.parse(options);

let cwd = process.cwd();
let server;

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
    new WebPackWrap().applyWebpackConfig(visualPackage, {
        devMode: true,
        generateResources: true,
        generatePbiviz: false,
        minifyJS: false,
        minify: false,
        target: typeof program.target === 'undefined' ? "es5" : program.target,
        devServerPort: program.port
    })
        .then(({ webpackConfig, oldProject }) => {
            let compiler = webpack(webpackConfig);
            ConsoleWriter.blank();
            ConsoleWriter.info('Starting server...');
            // webpack dev server serves bundle from disk instead memory
            if (program.drop) {
                webpackConfig.devServer.before = (app) => {
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
                        app.get(`${webpackConfig.devServer.publicPath}/${asset}`, function (req, res) {
                            setHeaders(res);
                            readFile(path.join(webpackConfig.devServer.contentBase, asset), res);
                        });
                    });
                };
            }
            // server old project by NodeJS server, need to skip build step
            if (!oldProject) {
                server = new WebpackDevServer(compiler, {
                    ...webpackConfig.devServer,
                    hot: !program.drop,
                    writeToDisk: program.drop
                });
                server.listen(webpackConfig.devServer.port, () => {
                    ConsoleWriter.info(`Server listening on port ${webpackConfig.devServer.port}`);
                });
            } else {
                compiler.watch({
                        aggregateTimeout: 1000, // wait so long for more changes
                        poll: false, // use polling instead of native watchers
                        ignored: /node_modules/
                    },
                    function (err) {
                        if (err) {
                            ConsoleWriter.error('Visual rebuild failed');
                            ConsoleWriter.error(err);
                            return;
                        }
                        ConsoleWriter.info('Visual rebuild completed');
                    }
                );
                const app = connect();
                app.use((req, res, next) => {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    next();
                });
                app.use(serveStatic(webpackConfig.devServer.contentBase));
                app.use('/' + webpackConfig.output.publicPath, serveStatic(webpackConfig.devServer.contentBase));
                server = https.createServer({
                    pfx: webpackConfig.devServer.https.pfx,
                    cert: webpackConfig.devServer.https.cert,
                    key: webpackConfig.devServer.https.key,
                    passphrase: webpackConfig.devServer.https.passphrase
                }, app).listen(webpackConfig.devServer, () => {
                    ConsoleWriter.info(`Server listening on port ${webpackConfig.devServer.port}`);
                });
            }
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


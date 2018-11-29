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

let program = require('commander');
let VisualPackage = require('../lib/VisualPackage');
let VisualServer = require('../lib/VisualServer');
let ConsoleWriter = require('../lib/ConsoleWriter');
let WebPackWrap = require('../lib/WebPackWrap');
const webpack = require("webpack");
let CommandHelpManager = require('../lib/CommandHelpManager');
let options = process.argv;

let confPath = '../config.json';
let config = require(confPath);
let CertificateTools = require("../lib/CertificateTools");

program
    .option('-t, --target [target]', 'Enable babel loader to compile JS into ES5 standart')
    .option('-p, --port [port]', 'set the port listening on')
    .option('-m, --mute', 'mute error outputs');

for (let i = 0; i < options.length; i++) {
    if (options[i] == '--help' || options[i] == '-h') {
        program.help(CommandHelpManager.createSubCommandHelpCallback(options));
        process.exit(0);
    }
}
    
program.parse(options);

let cwd = process.cwd();
let server, builder;

if (!CertificateTools.getCertFile(config, true)) {
    CertificateTools.createCertFile(config, true);
    if (!CertificateTools.getCertFile(config, true)) {
        ConsoleWriter.error('Certificate wasn\'t created');
    }
}

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
    new WebPackWrap().applyWebpackConfig(visualPackage, {
        devMode: true,
        generateResources: true,
        generatePbiviz: false,
        minifyJS: false,
        minify: false,
        target: typeof program.target === 'undefined' ? "es5" : program.target
    })
    .then((webpackConfig) => {
        let compiler = webpack(webpackConfig);
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

        ConsoleWriter.blank();
        ConsoleWriter.info('Starting server...');
        server = new VisualServer(visualPackage, program.port);
        server.start().then(() => {
            ConsoleWriter.info('Server listening on port ' + server.port + '.');
        }).catch(e => {
            ConsoleWriter.error('SERVER ERROR', e);
            process.exit(1);
        });
    })
    .catch(e => {
        ConsoleWriter.error(e.message);
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
        server.stop();
        server = null;
    }
    if (builder) {
        builder.stopWatcher();
        builder = null;
    }
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);


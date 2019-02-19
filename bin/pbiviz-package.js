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
let ConsoleWriter = require('../lib/ConsoleWriter');
let WebPackWrap = require('../lib/WebPackWrap');
const webpack = require("webpack");
let CommandHelpManager = require('../lib/CommandHelpManager');
let options = process.argv;

program
    .option('-t, --target [target]', 'Enable babel loader to compile JS into ES5 standart')
    .option('--resources', "Produces a folder containing the pbiviz resource files (js, css, json)")
    .option('--no-pbiviz', "Doesn't produce a pbiviz file (must be used in conjunction with resources flag)")
    .option('--no-minify', "Doesn't minify the js in the package (useful for debugging)")
    .option('--no-plugin', "Doesn't include a plugin declaration to the package (must be used in conjunction with --no-pbiviz and --resources flags)")
    .option('-c, --compression <compressionLevel>', "Enables compression of visual package", /^(0|1|2|3|4|5|6|7|8|9)$/i, "6");

for (let i = 0; i < options.length; i++) {
    if (options[i] == '--help' || options[i] == '-h') {
        program.help(CommandHelpManager.createSubCommandHelpCallback(options));
        process.exit(0);
    }
}

program.parse(options);

let cwd = process.cwd();

if (!program.pbiviz && !program.resources) {
    ConsoleWriter.error('Nothing to build. Cannot use --no-pbiviz without --resources');
    process.exit(1);
}

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
    ConsoleWriter.info('Building visual...');

    new WebPackWrap().applyWebpackConfig(visualPackage, {
        devMode: false,
        generateResources: program.resources || false,
        generatePbiviz: program.pbiviz || false,
        minifyJS: typeof program.minify === 'undefined' ? true : program.minify,
        minify: typeof program.minify === 'undefined' ? true : program.minify,
        target: typeof program.target === 'undefined' ? "es5" : program.target,
        compression: typeof program.compression === 'undefined' ? 0 : program.compression
    }).then(({ webpackConfig }) => {
        let compiler = webpack(webpackConfig);
        compiler.run(function (err, stats) {
            if (err) {
                ConsoleWriter.error(`Package wasn't created. ${JSON.stringify(err)}`);
            }
            if (stats.compilation.errors.length) {
                ConsoleWriter.error(`Package wasn't created. ${stats.compilation.errors.length} errors found`);
            }
            process.exit(0);
        });
    }).catch(e => {
        ConsoleWriter.error(e.message);
        process.exit(1);
    });
}).catch(e => {
    ConsoleWriter.error('LOAD ERROR', e);
    process.exit(1);
});

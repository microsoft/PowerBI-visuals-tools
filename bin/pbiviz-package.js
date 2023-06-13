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
import VisualManager from '../lib/VisualManager.js';
import program from 'commander';

const rootPath = process.cwd();
const options = process.argv;

program
    .option('--resources', "Produces a folder containing the pbiviz resource files (js, css, json)")
    .option('--no-pbiviz', "Doesn't produce a pbiviz file (must be used in conjunction with resources flag)")
    .option('--no-minify', "Doesn't minify the js in the package (useful for debugging)")
    .option('--no-plugin', "Doesn't include a plugin declaration to the package (must be used in conjunction with --no-pbiviz and --resources flags)")
    .option('--no-stats', "Doesn't generate statistics files")
    .option('-c, --compression <compressionLevel>', "Enables compression of visual package", /^(0|1|2|3|4|5|6|7|8|9)$/i, "6");

if (options.some(option => option === '--help' || option === '-h')) {
    program.help(CommandHelpManager.createSubCommandHelpCallback(options));
    process.exit(0);
}

program.parse(options);

if (!program.pbiviz && !program.resources) {
    ConsoleWriter.error('Nothing to build. Cannot use --no-pbiviz without --resources');
    process.exit(1);
}

const webpackOptions = {
    devMode: false,
    generateResources: program.resources,
    generatePbiviz: program.pbiviz,
    minifyJS: program.minify,
    minify: program.minify,
    compression: program.compression, 
    disableStats: !program.stats
}

new VisualManager(rootPath)
    .validateVisual()
    .initializeWebpack(webpackOptions)
    .then(visualManager => visualManager.generatePackage())


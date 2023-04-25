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
const webpack = require("webpack");
const chalk = require('chalk');

const featureAnalyzer = require('../lib/VisualFeaturesPrecheck');
const VisualPackage = require('../lib/VisualPackage');
const ConsoleWriter = require('../lib/ConsoleWriter');
const WebPackWrap = require('../lib/WebPackWrap');
const CommandHelpManager = require('../lib/CommandHelpManager');

let options = process.argv;

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

let cwd = process.cwd();

if (!program.pbiviz && !program.resources) {
    ConsoleWriter.error('Nothing to build. Cannot use --no-pbiviz without --resources');
    process.exit(1);
}

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
    preBuildRules(visualPackage.config).then(() => {
        ConsoleWriter.info('Building visual...');

        new WebPackWrap().applyWebpackConfig(visualPackage, {
            devMode: false,
            generateResources: program.resources,
            generatePbiviz: program.pbiviz,
            minifyJS: program.minify,
            minify: program.minify,
            compression: program.compression, 
            disableStats: !program.stats
        }).then(({ webpackConfig }) => {
            let compiler = webpack(webpackConfig);
            compiler.run(function (err, stats) {
                checkCertificationRules(visualPackage.config).then(() => {
                    ConsoleWriter.blank();
                    if (err) {
                        ConsoleWriter.error(`Package wasn't created. ${JSON.stringify(err)}`);
                    }
                    if (stats.compilation.errors.length) {
                        stats.compilation.errors.forEach(error => ConsoleWriter.error(error.message));
                        ConsoleWriter.error(`Package wasn't created. ${stats.compilation.errors.length} errors found.`);
                    }
                    if (!err && !stats.compilation.errors.length) {
                        ConsoleWriter.done('Build completed successfully');
                    }
                });
            });
        }).catch(e => {
            ConsoleWriter.error(e.message);
            process.exit(1);
        });
    });
}).catch(e => {
    ConsoleWriter.error('LOAD ERROR', e);
    process.exit(1);
});

async function checkCertificationRules(config) {
    const featuresTotalLog = {
        deprecation: (count) => `${count} deprecated ${count > 1 ? "features" : "feature"} are going to be required soon, please update your visual:`,
        warn: (count) => `Your visual doesn't support ${count} ${count > 1 ? "features" : "feature"} recommended for all custom visuals:`,
        info: (count) => `Your visual can be improved by adding ${count} ${count > 1 ? "features" : "feature"}:`
    };
    const logs = await featureAnalyzer.unsupportedFeatureList(config);
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

async function preBuildRules(config) {
    const errors = await featureAnalyzer.preBuildCheck(config);
    if (errors.length) {
        ConsoleWriter.error(`Package wasn't created. ${errors.length} errors found before compilation`);
        errors.forEach(error => ConsoleWriter.error(error));
        process.exit(1);
    }
}

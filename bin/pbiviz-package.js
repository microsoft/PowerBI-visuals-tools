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
const compareVersions = require("compare-versions");
const config = require('../config.json');
const VisualPackage = require('../lib/VisualPackage');
const ConsoleWriter = require('../lib/ConsoleWriter');
const WebPackWrap = require('../lib/WebPackWrap');
const webpack = require("webpack");
const CommandHelpManager = require('../lib/CommandHelpManager');

let options = process.argv;
const minAPIversion = config.constants.minAPIversion;

program
    .option('--resources', "Produces a folder containing the pbiviz resource files (js, css, json)", false)
    .option('--no-pbiviz', "Doesn't produce a pbiviz file (must be used in conjunction with resources flag)", false)
    .option('--no-minify', "Doesn't minify the js in the package (useful for debugging)", true)
    .option('--no-plugin', "Doesn't include a plugin declaration to the package (must be used in conjunction with --no-pbiviz and --resources flags)", false)
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
    if (visualPackage.config.apiVersion && compareVersions.compare(visualPackage.config.apiVersion, minAPIversion, "<")) {
        ConsoleWriter.error(`Package wasn't created, your current API is '${visualPackage.config.apiVersion}'.
        Please use 'powerbi-visuals-api' ${minAPIversion} or above to build a visual.`);
        process.exit(9);
    }
    ConsoleWriter.info('Building visual...');

    new WebPackWrap().applyWebpackConfig(visualPackage, {
        devMode: false,
        generateResources: program.resources,
        generatePbiviz: program.pbiviz,
        minifyJS: program.minify,
        minify: program.minify,
        compression: program.compression
    }).then(({ webpackConfig }) => {
        let compiler = webpack(webpackConfig);
        compiler.run(function (err, stats) {
            if (err) {
                ConsoleWriter.error(`Package wasn't created. ${JSON.stringify(err)}`);
            }
            if (stats.compilation.errors.length) {
                ConsoleWriter.error(`Package wasn't created. ${stats.compilation.errors.length} errors found`);
            }
            displayCertificationRules();
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

function displayCertificationRules() {
    ConsoleWriter.blank();
    ConsoleWriter.warn("Please, make sure that the visual source code matches to requirements of certification:");
    ConsoleWriter.blank();
    ConsoleWriter.info(`Visual must use API v${minAPIversion} and above`);
    ConsoleWriter.info("The project repository must:");
    ConsoleWriter.info("Include package.json and package-lock.json;");
    ConsoleWriter.info("Not include node_modules folder");
    ConsoleWriter.info("Run npm install expect no errors");
    ConsoleWriter.info("Run pbiviz package expect no errors");
    ConsoleWriter.info("The compiled package of the Custom Visual should match submitted package.");
    ConsoleWriter.info("npm audit command must not return any alerts with high or moderate level.");
    ConsoleWriter.info("The project must include Tslint from Microsoft with no overridden configuration, and this command shouldn’t return any tslint errors.");
    ConsoleWriter.info("https://www.npmjs.com/package/tslint-microsoft-contrib");
    ConsoleWriter.info("Ensure no arbitrary/dynamic code is run (bad: eval(), unsafe use of settimeout(), requestAnimationFrame(), setinterval(some function with user input).. running user input/data etc.)");
    ConsoleWriter.info("Ensure DOM is manipulated safely (bad: innerHTML, D3.html(<some user/data input>), unsanitized user input/data directly added to DOM, etc.)");
    ConsoleWriter.info("Ensure no js errors/exceptions in browser console for any input data. As test dataset please use this sample report");
    ConsoleWriter.blank();
    ConsoleWriter.info("Full description of certification requirements you can find in documentation:");
    ConsoleWriter.info("https://docs.microsoft.com/en-us/power-bi/power-bi-custom-visuals-certified#certification-requirements");
}

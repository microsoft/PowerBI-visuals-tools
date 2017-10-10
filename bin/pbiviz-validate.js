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

let fs = require('fs');
let path = require('path');
let program = require('commander');
let validator = require('powerbi-visuals-package-validator');
let VisualPackage = require('../lib/VisualPackage');
let ConsoleWriter = require('../lib/ConsoleWriter');
let CommandHelpManager = require('../lib/CommandHelpManager');
let options = process.argv;

for (let i = 0; i < options.length; i++) {
    if (options[i] == '--help' || options[i] == '-h') {
        program.help(CommandHelpManager.createSubCommandHelpCallback(options));
        process.exit(0);
    }
}

program.parse(options);

let cwd = process.cwd();
let args = program.args;

let validatePackage = (packagePath) => {
    if (fs.existsSync(packagePath)) {
        let runText = ['Run validator v.', validator.ver];
        let checkText = ['Checking package:', packagePath];
        ConsoleWriter.info(runText.join());
        ConsoleWriter.info(checkText.join(' '));
        ConsoleWriter.blank();

        validator.run(packagePath, ConsoleWriter.validationLog);
    } else {
        ConsoleWriter.error('Package not found. Please run "$ pbiviz package" first.');
    }
};

let initialize = ((args) => {
    if (args.length) {
        /**
         * checking package incoming from $ args
         */
        let packagePath = path.join(args[0]);

        validatePackage(packagePath);

    } else {

        /**
         * checking of default package which located in /dist/
         */
        VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
            let info = visualPackage.config;
            if (info) {
                let packageName = [visualPackage.config.visual.name, '.pbiviz'];
                let packagePath = path.join(visualPackage.basePath, 'dist', packageName.join());

                validatePackage(packagePath);
            } else {
                ConsoleWriter.error('Unable to load visual info. Please ensure the package is valid.');
            }
        }).catch((e) => {
            ConsoleWriter.error('LOAD ERROR', e);
            process.exit(1);
        });

    }
})(args);


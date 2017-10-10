
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
let VisualGenerator = require('../lib/VisualGenerator');
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

let args = program.args;

let cwd = process.cwd();

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
    let apiVersion = args.length > 0 ? args[0] : visualPackage.config.apiVersion;
    let visualPath = visualPackage.buildPath();
    VisualGenerator.updateApi(visualPath, apiVersion)
        .then(() => visualPackage.config.apiVersion === apiVersion ? false : VisualGenerator.setApiVersion(visualPath, apiVersion))
        .then(() => ConsoleWriter.info(`Visual api ${apiVersion} updated`))
        .catch(e => {
            ConsoleWriter.error('UPDATE ERROR', e);
            process.exit(1);
        });
}).catch((e) => {
    ConsoleWriter.error('LOAD ERROR', e);
    process.exit(1);
});

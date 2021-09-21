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
const ConsoleWriter = require('../lib/ConsoleWriter');
const CommandHelpManager = require('../lib/CommandHelpManager');
const TemplateFetcher = require('../lib/TemplateFetcher');
const config = require('../config.json');
const options = process.argv;

program
    .option('-f, --force', 'force creation (overwrites folder if exists)')
    .option('-t, --template [template]', 'use a specific template (default, table, slicer, rvisual, rhtml)');

for (let i = 0; i < options.length; i++) {
    if (options[i] == '--help' || options[i] == '-h') {
        program.help(CommandHelpManager.createSubCommandHelpCallback(options));
        process.exit(0);
    }
}

program.parse(options);

let args = program.args;

if (!args || args.length < 1) {
    ConsoleWriter.error("You must enter a visual name");
    process.exit(1);
}

let visualName = args.join(' ');
let cwd = process.cwd();

ConsoleWriter.info('Creating new visual');

if (program.force) {
    ConsoleWriter.warn('Running with force flag. Existing files will be overwritten');
}

let generateOptions = {
    force: program.force,
    template: program.template
};

if (config.visualTemplates[generateOptions.template]) {
    new TemplateFetcher({
        force: program.force,
        templateName: generateOptions.template,
        visualName: visualName
    }).fetch();
} else {
    VisualPackage.createVisualPackage(cwd, visualName, generateOptions).then(() => {
        ConsoleWriter.done('Visual creation complete');
    }).catch((e) => {
        ConsoleWriter.error('Unable to create visual.\n', e);
        process.exit(1);
    });
}

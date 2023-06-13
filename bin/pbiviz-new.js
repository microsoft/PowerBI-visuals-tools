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
import TemplateFetcher from '../lib/TemplateFetcher.js';
import VisualManager from '../lib/VisualManager.js';
import  program from 'commander';
import { readJsonFromRoot } from '../lib/utils.js';

const config = readJsonFromRoot('config.json');
const options = process.argv;

program
    .option('-f, --force', 'force creation (overwrites folder if exists)')
    .option('-t, --template [template]', 'use a specific template (default, table, slicer, rvisual, rhtml)', 'default');

if (options.some(option => option === '--help' || option === '-h')) {
    program.help(CommandHelpManager.createSubCommandHelpCallback(options));
    process.exit(0);
}

program.parse(options);

let args = program.args;

if (!args || args.length < 1) {
    ConsoleWriter.error("You must enter a visual name");
    process.exit(1);
}

let visualName = args.join(' ');
let cwd = process.cwd();

let generateOptions = {
    force: program.force,
    template: program.template
};

VisualManager.createVisual(cwd, visualName, generateOptions)
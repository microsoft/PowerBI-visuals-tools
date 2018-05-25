#!/usr/bin/env node
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

let confPath = '../config.json';
let exec = require('child_process').execSync;
let execAsync = require('child_process').exec;
let path = require('path');
let os = require('os');
let program = require('commander');
let npmPackage = require('../package.json');
let ConsoleWriter = require('../lib/ConsoleWriter');
let config = require(confPath);
let fs = require('fs');
let args = process.argv;
let StringDecoder = require('string_decoder').StringDecoder;
let readline = require('readline');
let CertificateTools = require("../lib/CertificateTools");

program
    .version(npmPackage.version)
    .command('new [name]', 'Create a new visual')
    .command('info', 'Display info about the current visual')
    .command('start', 'Start the current visual')
    .command('package', 'Package the current visual into a pbiviz file')
    .command('validate [path]', 'Validate pbiviz file for submission')
    .command('update [version]', 'Updates the api definitions and schemas in the current visual. Changes the version if specified')
    .option('--create-cert', 'Create new localhost certificate', onCreateCertFile)
    .option('--install-cert', 'Install localhost certificate', onOpenCertFile);

//prepend logo to help screen
if (args.length === 2 || (args.length > 2 && args[2] === 'help')) {
    ConsoleWriter.logo();
}

program.parse(args);

if (program.args.length > 0) {
    let validCommands = program.commands.map(c => c.name());
    if (validCommands.indexOf(program.args[0]) === -1) {
        ConsoleWriter.error("Invalid command. Run 'pbiviz help' for usage instructions.");
        process.exit(1);
    }
}

function onCreateCertFile() {
    return CertificateTools.createCertFile(config);
}

function onOpenCertFile() {
    return CertificateTools.openCertFile(config);
}

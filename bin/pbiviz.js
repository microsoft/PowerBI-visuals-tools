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

import { createCertFile, getCertFile, openCertFile } from "../lib/CertificateTools.js";
import ConsoleWriter from '../lib/ConsoleWriter.js';
import  program from 'commander';
import { readJsonFromRoot } from '../lib/utils.js';

const config = readJsonFromRoot('config.json');
const npmPackage = readJsonFromRoot('package.json');

let args = process.argv;

ConsoleWriter.info(`${npmPackage.name} version - ${npmPackage.version}`);

program
    .version(npmPackage.version)
    .command('new [name]', 'Create a new visual')
    .command('info', 'Display info about the current visual')
    .command('start', 'Start the current visual')
    .command('package', 'Package the current visual into a pbiviz file')
    .option('--install-cert', 'Creates and installs localhost certificate', createCertificate);

//prepend logo to help screen
if (args.length === 2 || (args.length > 2 && args[2] === 'help')) {
    ConsoleWriter.logoVisualization();
}

program.parse(args);

if (program.args.length > 0) {
    let validCommands = program.commands.map(c => c.name());
    if (validCommands.indexOf(program.args[0]) === -1) {
        ConsoleWriter.error("Invalid command. Run 'pbiviz help' for usage instructions.");
        process.exit(1);
    }
}

async function createCertificate() {
    let certPath = await getCertFile(config, true);
    
    if (!certPath) {
        ConsoleWriter.error("Certificate not found. The new certificate will be generated");
        await createCertFile(config, true);
    } else {
        await openCertFile(config);
    }
}

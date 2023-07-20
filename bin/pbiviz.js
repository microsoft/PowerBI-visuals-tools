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

import { createCertificate } from "../lib/CertificateTools.js";
import ConsoleWriter from '../lib/ConsoleWriter.js';
import CommandManager from '../lib/CommandManager.js';
import { readJsonFromRoot } from '../lib/utils.js';
import { Command, Option } from 'commander';

const npmPackage = readJsonFromRoot('package.json');
const rootPath = process.cwd();
const program = new Command();

const pbiviz = program
    .version(npmPackage.version)
    .option('--install-cert', 'Creates and installs localhost certificate', createCertificate)
    .showHelpAfterError('Run "pbiviz help" for usage instructions.')
    .addHelpText('beforeAll', ConsoleWriter.info(`${npmPackage.name} version - ${npmPackage.version}`))
    .addHelpText('before', ConsoleWriter.getLogoVisualization());

pbiviz
    .command('new')
    .usage("<argument> [options]")
    .argument('<name>', 'name of new visual')
    .option('-f, --force', 'force creation (overwrites folder if exists)')
    .addOption(new Option('-t, --template [template]', 'use a specific template')
        .choices(['default', 'table', 'slicer', 'rvisual', 'rhtml', 'circlecard'])
        .default('default')
    )
    .action((name, options) => {
        CommandManager.new(options, name, rootPath);
    });

pbiviz
    .command('info')
    .action(() => {
        CommandManager.info(rootPath);
    });

pbiviz
    .command('start')
    .usage('[options]')
    .option('-p, --port [port]', 'set the port listening on')
    .option('-d, --drop', 'drop outputs into output folder')
    .option('--no-stats', "Doesn't generate statistics files")
    .action(async (options) => {
        CommandManager.start(options, rootPath);
    });

pbiviz
    .command('package')
    .usage('[options]')
    .option('--resources', "Produces a folder containing the pbiviz resource files (js, css, json)")
    .option('--no-pbiviz', "Doesn't produce a pbiviz file (must be used in conjunction with resources flag)")
    .option('--no-minify', "Doesn't minify the js in the package (useful for debugging)")
    .option('--no-stats', "Doesn't generate statistics files")
    .addOption(new Option('-c, --compression <compressionLevel>', "Enables compression of visual package")
        .choices(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
        .default('6')
    )
    .action((options) => {
        CommandManager.package(options, rootPath);
    });

program.parse(process.argv);

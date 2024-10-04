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

import ConsoleWriter from '../lib/ConsoleWriter.js';
import CommandManager from '../lib/CommandManager.js';
import { readJsonFromRoot } from '../lib/utils.js';
import { program, Option } from 'commander';

const npmPackage = readJsonFromRoot('package.json');
const rootPath = process.cwd();
const pbivizFile = 'pbiviz.json';

const pbiviz = program
    .version(npmPackage.version)
    .showHelpAfterError('Run "pbiviz help" for usage instructions.')
    .addHelpText('beforeAll', ConsoleWriter.info(`${npmPackage.name} version - ${npmPackage.version}`))
    .addHelpText('before', ConsoleWriter.getLogoVisualization());

pbiviz
    .command('new')
    .usage("<argument> [options]")
    .argument('<name>', 'Name of new visual')
    .option('-f, --force', 'Force creation (overwrites folder if exists)')
    .addOption(new Option('-t, --template [template]', 'Use a specific template')
        .choices(['default', 'table', 'slicer', 'rvisual', 'rhtml', 'circlecard'])
        .default('default')
    )
    .action((name, options) => {
        CommandManager.new(options, name, rootPath);
    });

pbiviz
    .command('info')
    .description('Displays visual info')
    .action(() => {
        CommandManager.info(rootPath);
    });
 
pbiviz
    .command('install-cert')
    .description('Creates and installs localhost certificate')
    .action(() => {
        CommandManager.installCert();
    });

pbiviz
    .command('lint')
    .option('--fix', 'Enable autofixing of lint errors')
    .action(options => {
        CommandManager.lint({ ...options, verbose: true }, rootPath);
    });

pbiviz
    .command('start')
    .usage('[options]')
    .option('-p, --port [port]', 'Set the port listening on')
    .option('-d, --drop', 'Drop outputs into output folder')
    .option('--no-stats', "Doesn't generate statistics files")
    .option('--skip-api', "Skips powerbi-visuals-api verifying")
    .option('-l, --all-locales', "Keeps all locale files in the package. By default only used inside stringResources folder locales are included.")
    .option('-f, --pbiviz-file <pbiviz-file>', "Path to pbiviz.json file (useful for debugging)", pbivizFile)
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
    .option('--skip-api', "Skips powerbi-visuals-api verifying")
    .option('-l, --all-locales', "Keeps all locale files in the package. By default only used inside stringResources folder locales are included.")
    .option('-v, --verbose', "Enables verbose logging")
    .option('--fix', 'Enable autofixing of lint errors')
    .option('-p, --pbiviz-file <pbiviz-file>', "Path to pbiviz.json file (useful for debugging)", pbivizFile)
    .addOption(new Option('-c, --compression <compressionLevel>', "Enables compression of visual package")
        .choices(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
        .default('6')
    )
    .action((options) => {
        CommandManager.package(options, rootPath);
    });

program.parse(process.argv);

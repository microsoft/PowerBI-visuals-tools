
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

const { exec } = require('child_process');
let path = require('path');
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

let pbiviz;
try {
    pbiviz = require(path.join(cwd, "./pbiviz.json"));
}
catch (err) {
    throw new Error("pbiviz.json not found. You must be in the root of a visual project to run this command");
}

let pkg;
try {
    pkg = require(path.join(cwd, "./package.json"));
}
catch (err) {
    throw new Error("package.json not found. You must be in the root of a visual project to run this command");
}

let tsconfig;
try {
    tsconfig = require(path.join(cwd, "./tsconfig.json"));
}
catch (err) {
    throw new Error("tsconfig.json not found. You must be in the root of a visual project to run this command");
}

if (tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) {
    let packgeApiVersion;
    if (pkg.devDependencies && pkg.devDependencies["powerbi-visuals-api"]) {
        packgeApiVersion = pkg.devDependencies["powerbi-visuals-api"];
    }
    if (pkg.dependencies && pkg.dependencies["powerbi-visuals-api"]) {
        packgeApiVersion = pkg.dependencies["powerbi-visuals-api"];
    }

    try {
        let apiVersion;
        if (args.length > 0) {
            apiVersion = `~${args[0]}`;
        }
        if (!apiVersion && pbiviz.apiVersion) {
            apiVersion = `~${pbiviz.apiVersion}`;
        }
        if (!apiVersion && packgeApiVersion) {
            apiVersion = `~${packgeApiVersion}`;
        }
        if (!apiVersion) {
            apiVersion = "latest";
        }
        exec(`npm install --save powerbi-visuals-api@${apiVersion}`, (err, strout, stderror) => {
            if (err) {
                if (err.message.indexOf("No matching version found for powerbi-visuals-api") !== -1) {
                    throw new Error(`Error: Invalid API version: ${apiVersion}`);
                }
                ConsoleWriter.error(`npm install --save powerbi-visuals-api@${apiVersion} failed`);
                return;
            }
            ConsoleWriter.info(strout);
            ConsoleWriter.error(stderror);
        });
    } catch (error) {
        ConsoleWriter.error(error.message);
    }
} else {
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
}

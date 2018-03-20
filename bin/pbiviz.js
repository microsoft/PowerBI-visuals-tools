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

program
    .version(npmPackage.version)
    .command('new [name]', 'Create a new visual')
    .command('info', 'Display info about the current visual')
    .command('start', 'Start the current visual')
    .command('package', 'Package the current visual into a pbiviz file')
    .command('validate [path]', 'Validate pbiviz file for submission')
    .command('update [version]', 'Updates the api definitions and schemas in the current visual. Changes the version if specified')
    .option('--create-cert', 'Create new localhost certificate', createCertFile)
    .option('--install-cert', 'Install localhost certificate', openCertFile);

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

function removeCertFiles(certPath, keyPath, pfxPath) {
    try {
        fs.unlinkSync(certPath);
    } catch (e) {
        if (!e.message.indexOf("no such file or directory")) {
            throw e;
        }
    }
    try {
        fs.unlinkSync(keyPath);
    } catch (e) {
        if (!e.message.indexOf("no such file or directory")) {
            throw e;
        }
    }
    try {
        fs.unlinkSync(pfxPath);
    } catch (e) {
        if (!e.message.indexOf("no such file or directory")) {
            throw e;
        }
    }
}

function createCertFile() {
    const subject = "localhost";
    const keyLength = 2048;
    const algorithm = "sha256";
    const certName = "CN=localhost";
    const validPeriod = 180;
    const msInOneDay = 86400000;

    let certPath = path.join(__dirname, '..', config.server.certificate);
    let keyPath = path.join(__dirname, '..', config.server.privateKey);
    let pfxPath = path.join(__dirname, '..', config.server.pfx);

    let openCmds = {
        linux: 'openssl',
        darwin: 'openssl',
        win32: 'powershell'
    };
    let startCmd = openCmds[os.platform()];

    if (startCmd) {
        try {
            let createCertCommand = "";
            switch (os.platform()) {
                case "linux":
                    removeCertFiles(certPath, keyPath);
                    createCertCommand =
                        `  req -newkey rsa:${keyLength}` +
                        ` -nodes` +
                        ` -keyout ${keyPath}` +
                        ` -x509 ` +
                        ` -days ${validPeriod} ` +
                        ` -out ${certPath} ` +
                        ` -subj "/CN=${subject}"`;
                    exec(`${startCmd} ${createCertCommand}`);
                    break;
                case "darwin":
                    removeCertFiles(certPath, keyPath);
                    createCertCommand =
                        `  req -newkey rsa:${keyLength}` +
                        ` -nodes` +
                        ` -keyout ${keyPath}` +
                        ` -x509 ` +
                        ` -days ${validPeriod} ` +
                        ` -out ${certPath} ` +
                        ` -subj "/CN=${subject}"`;
                    exec(`${startCmd} ${createCertCommand}`);
                    if (fs.existsSync(certPath)) {
                        ConsoleWriter.info(`Certificate generated. Location is ${certPath}`); 
                    }
                    break;
                case "win32":
                    let passphrase = "";
                    // for windows 7
                    // 6.1 - Windows 7
                    // 6.2 - Windows 8
                    let osVersion = +os.release().split(".");
                    if (+osVersion[0] === 6 && osVersion[1] === 1 || osVersion[0] < 6) {
                        removeCertFiles(certPath, keyPath, pfxPath);
                        startCmd = "openssl";
                        createCertCommand =
                            `  req -newkey rsa:${keyLength}` +
                            ` -nodes` +
                            ` -keyout ${keyPath}` +
                            ` -x509 ` +
                            ` -days ${validPeriod} ` +
                            ` -out ${certPath} ` +
                            ` -subj "/CN=${subject}"`;
                        exec(`${startCmd} ${createCertCommand}`);
                        if (fs.existsSync(certPath)) {
                            ConsoleWriter.info(`Certificate generated. Location is ${certPath}`); 
                        }
                    } else {
                        // for windows 8 / 10
                        passphrase = Math.random().toString().substring(2);
                        config.server.passphrase = passphrase;
                        fs.writeFileSync(path.join(__dirname, confPath), JSON.stringify(config));

                        createCertCommand = `$cert = ('Cert:\\CurrentUser\\My\\' + (` +
                        `   New-SelfSignedCertificate ` +
                        `       -DnsName localhost ` +
                        `       -HashAlgorithm ${algorithm} ` +
                        `       -Type Custom ` +
                        `       -Subject ${subject} ` +
                        `       -KeyAlgorithm RSA ` +
                        `       -KeyLength ${keyLength} ` +
                        `       -KeyExportPolicy Exportable ` +
                        `       -CertStoreLocation Cert:\\CurrentUser\\My ` +
                        `       -NotAfter (get-date).AddDays(${validPeriod}) |` +
                        `   select Thumbprint | ` +
                        `   ForEach-Object { $_.Thumbprint.ToString() }).toString()); ` +
                        `   Export-PfxCertificate -Cert $cert` +
                        `       -FilePath '${pfxPath}' ` +
                        `       -Password (ConvertTo-SecureString -String '${passphrase}' -Force -AsPlainText)`;

                        exec(`${startCmd} "${createCertCommand}"`);
                        if (fs.existsSync(pfxPath)) {
                            ConsoleWriter.info(`Certificate generated. Location is ${pfxPath}. Passphrase is '${passphrase}'`); 
                        }
                    }
                    break;
            }
        } catch (e) {
            if (e.message.indexOf("'openssl' is not recognized as an internal or external command") > 0) {
                ConsoleWriter.warn('Create certificate error:');
                ConsoleWriter.warn('OpenSSL is not installed or not available from command line');
                ConsoleWriter.info('Install OpenSSL from https://www.openssl.org or https://wiki.openssl.org/index.php/Binaries');
                ConsoleWriter.info('and try again');

                ConsoleWriter.info('Read more at');
                ConsoleWriter.info('https://github.com/Microsoft/PowerBI-visuals/blob/master/tools/CreateCertificate.md#manual');
                return;
            }
            ConsoleWriter.error('Create certificate error:', e);
        }
    } else {
        ConsoleWriter.error('Unknown platform. Please place a custom-generated certificate in:', certPath);
    }
}

function getCertFile(config) {
    let  cert = path.join(__dirname, '..', config.server.certificate);
    let  pfx = path.join(__dirname, '..', config.server.pfx);

    if (fs.existsSync(cert)) {
        return cert;
    }
    if (fs.existsSync(pfx)) {
        if (config.server.passphrase) {
            ConsoleWriter.info(`Use '${config.server.passphrase}' passphrase to install PFX certificate.`);
        }
        return pfx;
    }

    ConsoleWriter.info('Certificate not found. Call `pbiviz --create-cert` command to create the new certificate');
    return null;
}

function openCertFile() {
    let certPath = getCertFile(config);
    
    if (!certPath) {
        return;
    }

    let openCmds = {
        linux: 'xdg-open',
        darwin: 'open',
        win32: 'powershell start'
    };
    let startCmd = openCmds[os.platform()];
    if (startCmd) {
        try {
            exec(`${startCmd} "${certPath}"`); 
        } catch (e) {
            ConsoleWriter.info('Certificate path:', certPath);
        }
    } else {
        ConsoleWriter.info('Certificate path:', certPath);
    }
}


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

import { exec as nodeExec } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import crypto from "crypto"
import { readJsonFromRoot } from './utils.js';
import ConsoleWriter from './ConsoleWriter.js';

const certSafePeriod = 1000 * 60 * 60 * 24; // 24 hours
const config = await readJsonFromRoot('config.json');
const pathToCertFolder = path.join(os.homedir(), config.server.certificateFolder);
const secretFilesPath = {
    certPath: path.join(pathToCertFolder, config.server.certificate),
    keyPath: path.join(pathToCertFolder, config.server.privateKey),
    pfxPath: path.join(pathToCertFolder, config.server.pfx),
    passphrasePath: path.join(pathToCertFolder, config.server.passphrase)
};

interface CertificateOptions {
    passphrase?: string;
    cert?: string;
    key?: string;
    pfx?: string;
    certificate?: string;
    privateKey?: string;
}

function exec(command, options?, callback?): Promise<string> {
    return new Promise((resolve, reject) => {
        const defaultCallback = (err, stdout: string, stderr) => {
            if (err) {
                reject(stderr);
            }
            resolve(stdout);
        };
        nodeExec(command, options, callback ? callback : defaultCallback);
    });

}

export async function createCertificate() {
    const certPath = await getCertFile(true);
    
    if (!certPath) {
        ConsoleWriter.error("Certificate not found. The new certificate will be generated");
        await createCertFile(true);
    } else {
        await openCertFile();
    }
}

export async function createCertFile(open = false) {
    ConsoleWriter.info(`Generating a new certificate...`);
    const subject = "localhost";
    const keyLength = 2048;
    const validPeriod = 365;
    const { certPath, keyPath, pfxPath } = secretFilesPath;

    const openCmds = {
        linux: 'openssl',
        darwin: 'openssl',
        win32: 'pwsh'
    };
    let startCmd = openCmds[os.platform()];

    if (!startCmd) {
        ConsoleWriter.error(['Unknown platform. Please place a custom-generated certificate in:', certPath])
        return;
    }
    
    try {
        let createCertCommand = "";
        let passphrase = "";
        fs.ensureDirSync(path.dirname(certPath));
        switch (os.platform()) {
            case "linux":
            case "darwin":
                createCertCommand =
                    `  req -newkey rsa:${keyLength}` +
                    ` -nodes` +
                    ` -keyout ${keyPath}` +
                    ` -x509 ` +
                    ` -days ${validPeriod} ` +
                    ` -out ${certPath} ` +
                    ` -subj "/CN=${subject}"`;
                await Promise.all([
                    removeCertFiles(certPath, keyPath), 
                    exec(`${startCmd} ${createCertCommand}`)
                ]);
                if (await fs.exists(certPath)) {
                    ConsoleWriter.info(`Certificate generated. Location is ${certPath}`);
                    if (open) {
                        await openCertFile();
                    }
                }
                break;
            case "win32":
                passphrase = getRandomValues()[0].toString().substring(2);
                createCertCommand = `$cert = ('Cert:\\CurrentUser\\My\\' + (` +
                    `   New-SelfSignedCertificate ` + 
                    `       -DnsName localhost ` +
                    `       -Type Custom ` +
                    `       -Subject 'CN=${subject}' ` +
                    `       -KeyAlgorithm RSA ` +
                    `       -KeyLength ${keyLength} ` +
                    `       -KeyExportPolicy Exportable ` +
                    `       -CertStoreLocation Cert:\\CurrentUser\\My ` +
                    `       -NotAfter (get-date).AddDays(${validPeriod}) ` +
                    `   | select Thumbprint | ` +
                    `   ForEach-Object { $_.Thumbprint.ToString() }).toString()); ` +
                    `   Export-PfxCertificate -Cert $cert` +
                    `       -FilePath '${pfxPath}' ` +
                    `       -Password (ConvertTo-SecureString -String '${passphrase}' -Force -AsPlainText)`;
                    await Promise.all([
                        removeCertFiles(certPath, keyPath, pfxPath), 
                        exec(`${startCmd} -Command "${createCertCommand}"`),
                        savePassphrase(passphrase)
                    ]);
                if (await fs.exists(pfxPath)) {
                    ConsoleWriter.info(`Certificate generated. Location is ${pfxPath}. Passphrase is ${passphrase}`);
                }
                break;
            default:
                ConsoleWriter.error('Unknown platform');
                break;
        }
    } catch (e) {
        if (e && e.message && e.message.indexOf("'openssl' is not recognized as an internal or external command") > 0) {
            ConsoleWriter.warning('Create certificate error:');
            ConsoleWriter.warning('OpenSSL is not installed or not available from command line');
            ConsoleWriter.info('Install OpenSSL from https://www.openssl.org or https://wiki.openssl.org/index.php/Binaries');
            ConsoleWriter.info('and try again');

            ConsoleWriter.info('Read more at');
            ConsoleWriter.info('https://github.com/Microsoft/PowerBI-visuals/blob/master/tools/CreateCertificate.md#manual');
        } else {
            ConsoleWriter.error(['Create certificate error:', e]);
        }
    }
}

async function getCertFile(silent = false) {
    const { certPath, pfxPath, passphrasePath } = secretFilesPath;
    if (await fs.exists(certPath)) {
        return certPath;
    }

    if (await fs.exists(pfxPath)) {
        if (!silent && await fs.exists(passphrasePath)) {
            const passphrase = await fs.readFile(passphrasePath, 'utf8')
            ConsoleWriter.info(`Use '${passphrase}' passphrase to install PFX certificate.`);
        }
        return pfxPath;
    }

    if (!silent) {
        ConsoleWriter.info('Certificate not found. Call `pbiviz install-cert` command to create the new certificate');
    }
    return null;
}

async function openCertFile() {
    const openCmds = {
        linux: 'xdg-open',
        darwin: 'open',
        win32: 'powershell start'
    };
    const startCmd = openCmds[os.platform()];
    const certPath = await getCertFile();
    try {
        if (!startCmd || !certPath) {
            throw new Error(); 
        }
        await exec(`${startCmd} "${certPath}"`);
    } catch (e) {
        ConsoleWriter.info(['Certificate path:', certPath]);
    }
}

export async function removeCertFiles(...paths) {
    paths.forEach(async (path) => {
        try {
            await fs.unlink(path);
        } catch (e) {
            if (!e.message.indexOf("no such file or directory")) {
                throw e;
            }
        }
    });
}

export async function resolveCertificate() {
    const options: CertificateOptions = {};
    const { certPath, keyPath, pfxPath, passphrasePath } = secretFilesPath;
    const isCertificateValid = await verifyCertFile(keyPath, certPath, pfxPath, passphrasePath);
    if (!isCertificateValid) {
        await createCertFile();
    }
    if (await fs.exists(passphrasePath)) {
        options.passphrase = await fs.readFile(passphrasePath, 'utf8');
    }
    if (await fs.exists(keyPath)) {
        options.key = await fs.readFile(keyPath);
    }
    if (await fs.exists(certPath)) {
        options.cert = await fs.readFile(certPath);
    }
    if (await fs.exists(pfxPath)) {
        options.pfx = await fs.readFile(pfxPath);
    }
    return options;
}

export async function verifyCertFile(keyPath, certPath, pfxPath, passphrasePath) {
    let verifyCertDate = false;
    try {
        let endDateStr;

        if (os.platform() === "win32") {
            if (!fs.existsSync(pfxPath) || !fs.existsSync(passphrasePath)) {
                throw new Error('PFX or passphrase file not found');
            }
            const passphrase = await fs.readFile(passphrasePath, 'utf8');
            const command = `(New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("${pfxPath}",'${passphrase}')).NotAfter.ToString('yyyy-MM-dd HH:mm:ss')`;
            const certStr = await exec(command, { shell: 'powershell.exe' });
            endDateStr = certStr.trim();
        } else if (os.platform() === "linux" || os.platform() === "darwin") {
            if (!(await fs.exists(certPath))) {
                throw new Error('Certificate file not found');
            }
            endDateStr = await exec(`openssl x509 -enddate -noout -in ${certPath} | cut -d = -f 2`);
        }

        const endDate = Date.parse(endDateStr);
        verifyCertDate = (endDate - Date.now()) > certSafePeriod;
        if (verifyCertDate) {
            ConsoleWriter.info(`Certificate is valid.`);
        } else {
            throw new Error('Certificate is invalid');
        }
    } catch (err) {
        ConsoleWriter.warning(`Certificate verification error: ${err}`);
        removeCertFiles(certPath, keyPath, pfxPath, passphrasePath);
    }
    return verifyCertDate;
}

const getRandomValues = () => {
    if(crypto.getRandomValues !== undefined){
        return crypto.getRandomValues(new Uint32Array(1));
    }
    return crypto.webcrypto.getRandomValues(new Uint32Array(1));
}

const savePassphrase = async (passphrase) => {
    const { passphrasePath } = secretFilesPath;
    await fs.writeFileSync(passphrasePath, passphrase);
}
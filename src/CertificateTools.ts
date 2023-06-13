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

import { getRootPath, readJsonFromRoot } from './utils.js';
import ConsoleWriter from './ConsoleWriter.js';
import fs from 'fs-extra';
import { exec as nodeExec } from 'child_process';
import  os from 'os';
import  path from 'path';

const config = readJsonFromRoot('config.json');

const certSafePeriod = 1000 * 60 * 60 * 24;
const rootPath = getRootPath();
const confPath = '../config.json';

interface CertificateOptions {
    passphrase?: string;
    cert?: string;
    key?: string;
    pfx?: string;
    certificate?: string;
    privateKey?: string;
}

function exec(command, callback?): Promise<string> {
    return new Promise((resolve, reject) => {
        nodeExec(command, callback ? callback : (err, stdout: string, stderr) => {
            if (err) {
                reject(stderr);
            }
            resolve(stdout);
        });
    });

}

export async function createCertFile(config, open) {
    ConsoleWriter.info(`Generating a new certificate...`);
    const subject = "localhost";
    const keyLength = 2048;
    const algorithm = "sha256";
    const validPeriod = 365;

    if (typeof open === 'undefined') {
        open = false;
    }

    const certPath = path.join(rootPath, config.server.certificate);
    const keyPath = path.join(rootPath, config.server.privateKey);
    const pfxPath = path.join(rootPath, config.server.pfx);

    const openCmds = {
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
                    await removeCertFiles(certPath, keyPath);
                    createCertCommand =
                        `  req -newkey rsa:${keyLength}` +
                        ` -nodes` +
                        ` -keyout ${keyPath}` +
                        ` -x509 ` +
                        ` -days ${validPeriod} ` +
                        ` -out ${certPath} ` +
                        ` -subj "/CN=${subject}"`;
                    await exec(`${startCmd} ${createCertCommand}`);
                    if (await fs.exists(certPath)) {
                        ConsoleWriter.info(`Certificate generated. Location is ${certPath}`);
                        if (open) {
                            await openCertFile(config);
                        }
                    }
                    break;
                case "darwin":
                    await removeCertFiles(certPath, keyPath);
                    createCertCommand =
                        `  req -newkey rsa:${keyLength}` +
                        ` -nodes` +
                        ` -keyout ${keyPath}` +
                        ` -x509 ` +
                        ` -days ${validPeriod} ` +
                        ` -out ${certPath} ` +
                        ` -subj "/CN=${subject}"`;
                    await exec(`${startCmd} ${createCertCommand}`);
                    if (await fs.exists(certPath)) {
                        ConsoleWriter.info(`Certificate generated. Location is ${certPath}`);
                        if (open) {
                            await openCertFile(config);
                        }
                    }
                    break;
                case "win32":
                    let passphrase = "";
                    // for windows 7 and others
                    // 6.1 - Windows 7
                    const osVersion = os.release().split(".");
                    if ((Number(osVersion[0]) === 6 && Number(osVersion[1]) === 1) || Number(osVersion[0]) < 6) {
                        await removeCertFiles(certPath, keyPath, pfxPath);
                        startCmd = "openssl";
                        createCertCommand =
                            `  req -newkey rsa:${keyLength}` +
                            ` -nodes` +
                            ` -keyout ${keyPath}` +
                            ` -x509 ` +
                            ` -days ${validPeriod} ` +
                            ` -out ${certPath} ` +
                            ` -subj "/CN=${subject}"`;
                        await exec(`${startCmd} ${createCertCommand}`);
                        if (await fs.exists(certPath)) {
                            ConsoleWriter.info(`Certificate generated. Location is ${certPath}`);
                            if (open) {
                                await openCertFile(config);
                            }
                        }
                        break;
                    }
                    // for windows 8 / 8.1 / server 2012 R2 /
                    if (Number(osVersion[0]) === 6 && (Number(osVersion[1]) === 2 || Number(osVersion[1]) === 3)) {
                        // for 10
                        passphrase = Math.random().toString().substring(2);
                        config.server.passphrase = passphrase;
                        fs.writeFileSync(path.join(rootPath, "dist", confPath), JSON.stringify(config));

                        createCertCommand = `$cert = ('Cert:\\CurrentUser\\My\\' + (` +
                            `   New-SelfSignedCertificate ` +
                            `       -DnsName localhost ` +
                            `       -CertStoreLocation Cert:\\CurrentUser\\My ` +
                            `   | select Thumbprint | ` +
                            `   ForEach-Object { $_.Thumbprint.ToString() }).toString()); ` +
                            `   Export-PfxCertificate -Cert $cert` +
                            `       -FilePath '${pfxPath}' ` +
                            `       -Password (ConvertTo-SecureString -String '${passphrase}' -Force -AsPlainText)`;

                        await exec(`${startCmd} "${createCertCommand}"`);
                        if (await fs.exists(pfxPath)) {
                            ConsoleWriter.info(`Certificate generated. Location is ${pfxPath}. Passphrase is '${passphrase}'`);
                        }
                    } else {
                        // for window 10 / server 2016
                        passphrase = Math.random().toString().substring(2);
                        config.server.passphrase = passphrase;
                        fs.writeFileSync(path.join(rootPath, "dist", confPath), JSON.stringify(config));

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
                            `       -NotAfter (get-date).AddDays(${validPeriod}) ` +
                            `   | select Thumbprint | ` +
                            `   ForEach-Object { $_.Thumbprint.ToString() }).toString()); ` +
                            `   Export-PfxCertificate -Cert $cert` +
                            `       -FilePath '${pfxPath}' ` +
                            `       -Password (ConvertTo-SecureString -String '${passphrase}' -Force -AsPlainText)`;

                        await exec(`${startCmd} "${createCertCommand}"`);
                        if (await fs.exists(pfxPath)) {
                            ConsoleWriter.info(`Certificate generated. Location is ${pfxPath}. Passphrase is '${passphrase}'`);
                        }
                    }
                    break;
                default:
                    ConsoleWriter.error('Unknown platform');
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
    } else {
        ConsoleWriter.error(['Unknown platform. Please place a custom-generated certificate in:', certPath]);
    }
}

export async function getCertFile(config, silent?) {
    if (typeof silent === "undefined") {
        silent = false;
    }
    const cert = path.join(rootPath, config.server.certificate);
    const pfx = path.join(rootPath, config.server.pfx);

    if (await fs.exists(cert)) {
        return cert;
    }
    if (await fs.exists(pfx)) {
        if (config.server.passphrase) {
            if (!silent) {
                ConsoleWriter.info(`Use '${config.server.passphrase}' passphrase to install PFX certificate.`);
            }
        }
        return pfx;
    }

    if (!silent) {
        ConsoleWriter.info('Certificate not found. Call `pbiviz --install-cert` command to create the new certificate');
    }
    return null;
}

export async function openCertFile(config) {
    const certPath = await getCertFile(config);

    if (!certPath) {
        return null;
    }

    const openCmds = {
        linux: 'xdg-open',
        darwin: 'open',
        win32: 'powershell start'
    };
    const startCmd = openCmds[os.platform()];
    if (startCmd) {
        try {
            await exec(`${startCmd} "${certPath}"`);
        } catch (e) {
            ConsoleWriter.info(['Certificate path:', certPath]);
        }
    } else {
        ConsoleWriter.info(['Certificate path:', certPath]);
    }
}

export async function removeCertFiles(certPath, keyPath, pfxPath?) {
    try {
        await fs.unlink(certPath);
    } catch (e) {
        if (!e.message.indexOf("no such file or directory")) {
            throw e;
        }
    }
    try {
        await fs.unlink(keyPath);
    } catch (e) {
        if (!e.message.indexOf("no such file or directory")) {
            throw e;
        }
    }
    try {
        await fs.unlink(pfxPath);
    } catch (e) {
        if (!e.message.indexOf("no such file or directory")) {
            throw e;
        }
    }
}

export async function getGlobalPbivizCerts() {
    const options: CertificateOptions = {};
    try {
        const location = ((await exec('npm ls -g powerbi-visuals-tools'))).split("\n")[0];
        const certPath = path.join(location, "node_modules", "powerbi-visuals-tools", config.server.certificate);
        const keyPath = path.join(location, "node_modules", "powerbi-visuals-tools", config.server.privateKey);
        const pfxPath = path.join(location, "node_modules", "powerbi-visuals-tools", config.server.pfx);
        const globalPbivizConfig = path.join(location, "node_modules", "powerbi-visuals-tools", "config.json");
        options.passphrase = fs.existsSync(globalPbivizConfig) && fs.readJSONSync(globalPbivizConfig).server.passphrase;

        const CertFileVerified = await verifyCertFile(keyPath, certPath, pfxPath, options.passphrase);

        options.cert = fs.existsSync(certPath) && certPath;
        options.key = fs.existsSync(keyPath) && keyPath;
        options.pfx = fs.existsSync(pfxPath) && CertFileVerified && pfxPath;
    }
    catch (err) {
        ConsoleWriter.warning(`Global certificate error: ${err}`);
    }
    if (!options.cert && !options.pfx) {
        ConsoleWriter.warning(`Global instance of valid pbiviz certificate not found.`);
    }
    return options;
}

export async function resolveCertificate() {
    const options: CertificateOptions = {};
    const keyPath = path.join(rootPath, config.server.privateKey);
    const certPath = path.join(rootPath, config.server.certificate);
    const pfxPath = path.join(rootPath, config.server.pfx);

    if (config.server.passphrase) {
        options.passphrase = config.server.passphrase;
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

    const CertFileVerified = await verifyCertFile(keyPath, certPath, pfxPath, options.passphrase);

    if ((!options.cert && !options.pfx) || !CertFileVerified) {
        ConsoleWriter.warning("Local valid certificate not found.");
        ConsoleWriter.info("Checking global instance of pbiviz certificate...");
        const globalPbivizOptions = await getGlobalPbivizCerts();

        if (!globalPbivizOptions.cert && !globalPbivizOptions.pfx) {
            await createCertFile(config, true);
            if (!(await getCertFile(config, true))) {
                ConsoleWriter.error('Certificate wasn\'t created');
                throw new Error("Call `pbiviz --install-cert` command to create the new certificate");
            }
            else {
                if (config.server.passphrase) {
                    options.passphrase = config.server.passphrase;
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
            }
        }
        else {
            // copy certs to local instance
            ConsoleWriter.info("Copy server certificate from global instance of pbiviz...");
            if (globalPbivizOptions.cert) {
                await fs.copyFile(globalPbivizOptions.cert, path.join(rootPath, config.server.certificate));
                options.certificate = config.server.certificate;
            }
            if (globalPbivizOptions.key) {
                await fs.copyFile(globalPbivizOptions.key, path.join(rootPath, config.server.privateKey));
                options.privateKey = config.server.privateKey;
            }
            if (globalPbivizOptions.pfx) {
                await fs.copyFile(globalPbivizOptions.pfx, path.join(rootPath, config.server.pfx));
                // need to pass whole file instead path to file
                options.pfx = await fs.readFile(path.join(rootPath, config.server.pfx));
                options.passphrase = globalPbivizOptions.passphrase;
                // eslint-disable-next-line require-atomic-updates
                config.server.passphrase = globalPbivizOptions.passphrase;
            }
            await fs.writeFile(path.join(rootPath, "dist", confPath), JSON.stringify(config));
        }
    }
    return options;
}

export async function verifyCertFile(keyPath, certPath, pfxPath, passphrase) {
    let verifyCertDate;
    try {
        let endDateStr;

        // For Windows OS:
        if (os.platform() === "win32") {
            if (!fs.existsSync(pfxPath) || !passphrase) {
                return false;
            }
            const certStr = await exec(`powershell.exe (New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('${pfxPath}','${passphrase}')).NotAfter.ToString('yyyy-MM-dd HH:mm:ss')`);
            endDateStr = certStr.trim();
        }
        // For Linux and Mac/darwin OS:
        else if (os.platform() === "linux" || os.platform() === "darwin") {
            if (!fs.existsSync(certPath)) {
                return false;
            }
            endDateStr = await exec(`openssl x509 -enddate -noout -in ${certPath} | cut -d = -f 2`);
        }

        const endDate = Date.parse(endDateStr);
        verifyCertDate = (endDate - Date.now()) > certSafePeriod;
        if (verifyCertDate) {
            ConsoleWriter.info(`Certificate is valid.`);
        } else {
            ConsoleWriter.warning(`Certificate is invalid!`);
            removeCertFiles(certPath, keyPath, pfxPath);
        }
    } catch (err) {
        ConsoleWriter.warning(`Certificate verification error: ${err}`);
        removeCertFiles(certPath, keyPath, pfxPath);
    }
    return verifyCertDate;
}

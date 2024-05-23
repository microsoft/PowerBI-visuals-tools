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

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { readJsonFromRoot } from '../../lib/utils.js';
import { createCertFile } from '../../lib/CertificateTools.js';

const config = readJsonFromRoot('config.json');

describe("E2E - pbiviz install-cert", () => {
    beforeEach((done) => {
        createCertFile(config, false).then(done);
    });

    describe("pbiviz", () => {
        fit("pbiviz install-cert command should generate certificate", (done) => {
            const homeDir = os.homedir();
            const certPath = path.join(homeDir, config.server.certificate);
            const keyPath = path.join(homeDir, config.server.privateKey);
            const pfxPath = path.join(homeDir, config.server.pfx);
            const certExists = fs.existsSync(certPath);
            const keyExists = fs.existsSync(keyPath);
            const pfxExists = fs.existsSync(pfxPath);

            const result = (certExists && keyExists) || pfxExists;

            expect(result).toBeTruthy();
            done();
        });
    });
});

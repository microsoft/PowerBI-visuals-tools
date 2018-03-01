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

let fs = require('fs-extra');
let path = require('path');
let async = require('async');
let JSZip = require('jszip');
let request = require('request');
console.log(__dirname);
let confPath = '../../config.json';
let config = require(confPath);

let FileSystem = require('../helpers/FileSystem.js');

const tempPath = FileSystem.getTempPath();
const startPath = process.cwd();

describe("E2E - pbiviz --create-cert", () => {
    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('', '--create-cert');
    });

    describe("pbiviz", () => {
        it("pbiviz --create-cert command should generate certificate", (done) => {
            let certPath = path.join(__dirname, "../../", config.server.certificate);
            let keyPath = path.join(__dirname, "../../", config.server.privateKey);
            let pfxPath = path.join(__dirname, "../../", config.server.pfx);
            let certExists = fs.existsSync(certPath);
            let keyExists = fs.existsSync(keyPath);
            let pfxExists = fs.existsSync(pfxPath);

            let result = certExists && keyExists || pfxExists;

            expect(result).toBeTruthy();
            done();
        });
    });
});

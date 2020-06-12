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

const fs = require('fs-extra');
const path = require('path');
const lodashFindIndex = require('lodash.findindex');

const FileSystem = require('../helpers/FileSystem.js');
const writeMetadata = require("./utils").writeMetadata;

const tempPath = FileSystem.getTempPath();
const startPath = process.cwd();
const visualName = 'visualname';
const visualPath = path.join(tempPath, visualName);

describe("E2E - pbiviz update", () => {

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName, ' -t default1 --force');
        process.chdir(visualPath);

        writeMetadata(visualPath);
    });

    afterEach(() => {
        process.chdir(startPath);
    });

    afterAll(() => {
        process.chdir(startPath);
        FileSystem.deleteTempDirectory();
    });

    it("Should throw error if not in the visual root", () => {
        let error;
        process.chdir(tempPath);

        try {
            FileSystem.runPbiviz('update');
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
        expect(error.status).toBe(1);
        expect(error.message).toContain("Error: pbiviz.json not found. You must be in the root of a visual project to run this command");
    });

    it("Should fail with invalid version number", () => {
        let error;

        try {
            FileSystem.runPbiviz('update', '99.99.99');
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
        expect(error.status).toBe(1);
        expect(error.message).toContain("Error: Invalid API version: 99.99.99");
    });

    it("Should update version specified in pbiviz.json by default", () => {
        let pbivizJson = fs.readJsonSync(path.join(visualPath, 'pbiviz.json'));
        fs.removeSync(path.join(visualPath, '.api'));

        FileSystem.runPbiviz('update');

        //check api version was recreated
        let stat = fs.statSync(path.join(visualPath, '.api', 'v' + pbivizJson.apiVersion));
        expect(stat.isDirectory()).toBe(true);
    });

    it("Should update to version specified and update pbiviz.json, tsconfig.json", () => {
        let pbivizJson = fs.readJsonSync(path.join(visualPath, 'pbiviz.json'));
        expect(pbivizJson.apiVersion).not.toBe('1.0.0');

        //check that the file doesn't already exist
        let statPreError;
        try {
            fs.statSync(path.join(visualPath, '.api', 'v1.0.0'));
        } catch (e) {
            statPreError = e;
        }
        expect(statPreError).toBeDefined();
        expect(statPreError.code).toBe('ENOENT');

        FileSystem.runPbiviz('update', '1.0.0');

        //api version file should've been created
        let stat = fs.statSync(path.join(visualPath, '.api', 'v1.0.0'));
        expect(stat.isDirectory()).toBe(true);

        //pbiviz version number should've been updated
        pbivizJson = fs.readJsonSync(path.join(visualPath, 'pbiviz.json'));
        expect(pbivizJson.apiVersion).toBe('1.0.0');  

        //tsconfig should've been updated
        let tsConfig = fs.readJsonSync(path.join(visualPath, 'tsconfig.json'));
        let typeDefIndex = lodashFindIndex(tsConfig.files, i => i.match(/.api\/.+\/PowerBI-visuals.d.ts$/));
        expect(tsConfig.files[typeDefIndex]).toBe('.api/v1.0.0/PowerBI-visuals.d.ts');
    });
});

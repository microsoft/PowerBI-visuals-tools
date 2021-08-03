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

const FileSystem = require('../helpers/FileSystem.js');
const writeMetadata = require("./utils").writeMetadata;
const semver = require('semver');

const tempPath = FileSystem.getTempPath();
const startPath = process.cwd();
const visualName = 'visualname';
const visualPath = path.join(tempPath, visualName);

describe("E2E - webpack tools", () => {
    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName, ' -t default --force');
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

    let removeApi = () => {
        let packageJson = fs.readJsonSync(path.join(visualPath, 'package.json'));
        packageJson.dependencies = {
            "powerbi-visuals-utils-dataviewutils": "2.0.1"
        };
        fs.writeJsonSync(path.join(visualPath, 'package.json'), packageJson);
        
        fs.removeSync(path.join(visualPath, "node_modules", "powerbi-visuals-api"));
    };

    it("Should not add empty dependencies option into visual config", () => {
        FileSystem.runPbiviz('package');

        let packageJson = fs.readJsonSync(path.join(visualPath, '.tmp/drop/pbiviz.json'));
        expect(packageJson.dependencies).not.toBeDefined();
    });

    it("Should install the latest powerbi-visual-api if apiVersion is undefined", () => {
        let pbivizJson = fs.readJsonSync(path.join(visualPath, 'pbiviz.json'));
        pbivizJson.apiVersion = null;
        fs.writeJsonSync(path.join(visualPath, 'pbiviz.json'), pbivizJson);

        removeApi();
        FileSystem.runPbiviz('package');

        let packageJson = fs.readJsonSync(path.join(visualPath, 'package.json'));
        expect(packageJson.dependencies["powerbi-visuals-api"]).toBeDefined();
    });

    it("Should install powerbi-visual-api with version from pbiviz.json on 'pbiviz start/package'", () => {
        let pbivizJson = fs.readJsonSync(path.join(visualPath, 'pbiviz.json'));
        removeApi();
        FileSystem.runPbiviz('package');

        let packageJson = fs.readJsonSync(path.join(visualPath, 'package.json'));
        expect(packageJson.dependencies["powerbi-visuals-api"]).toBeDefined();
        expect(semver.major(pbivizJson.apiVersion))
            .toBe(semver.major(packageJson.dependencies["powerbi-visuals-api"].replace(/\^|\~/, ""))); // eslint-disable-line no-useless-escape
        expect(semver.minor(pbivizJson.apiVersion))
            .toBe(semver.minor(packageJson.dependencies["powerbi-visuals-api"].replace(/\^|\~/, ""))); // eslint-disable-line no-useless-escape
    });

});

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
const utils = require('./utils');

let FileSystem = require('../helpers/FileSystem.js');
const writeMetadata = require("./utils").writeMetadata;

const tempPath = FileSystem.getTempPath();
const templatePath = FileSystem.getTemplatePath();
const startPath = process.cwd();

describe("E2E - pbiviz new", () => {

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
    });

    afterEach(() => {
        process.chdir(startPath);
    });

    afterAll(() => {
        process.chdir(startPath);
        FileSystem.deleteTempDirectory();
    });

    it("Should generate new visual with default template", () => {
        let visualName = 'visualname';
        let template = 'default';
        let visualPath = path.join(tempPath, visualName);

        FileSystem.runPbiviz('new', visualName, ' -t default');

        writeMetadata(visualPath);

        //check base dir
        let stat = fs.statSync(visualPath);
        expect(stat.isDirectory()).toBe(true);

        //check contents
        let expectedFiles = utils.readdirSyncRecursive(path.join(templatePath, 'visuals', template));
        expectedFiles.concat(utils.readdirSyncRecursive(path.join(templatePath, 'visuals', '_global')));
        expectedFiles.push('/pbiviz.json');
        let visualFiles = utils.readdirSyncRecursive(visualPath);
        let fileDiff = [expectedFiles, visualFiles].reduce((a, b) => a.filter(c => !b.includes(c)));
        expect(fileDiff.length).toBe(0);

        // check exists node_modules directory
        let nodeModulesDirStat = fs.statSync(path.join(visualPath, "node_modules"));
        expect(nodeModulesDirStat.isDirectory()).toBe(true);

        //check pbiviz.json config file
        let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
        expect(visualConfig.name).toBe(visualName);
        expect(visualConfig.displayName).toBe(visualName);
        expect(visualConfig.guid).toBeDefined();
        expect(visualConfig.guid).toMatch(/^[a-zA-Z0-9]+$/g);
        expect(visualConfig.guid.substr(0, visualName.length)).toBe(visualName);
    });

    describe('Should generate new visual using specified template', () => {
        it('table', () => {
            const template = 'table';

            testGeneratedVisualByTemplateName(template);
        });

        it('slicer', () => {
            const template = 'slicer';

            testGeneratedVisualByTemplateName(template);
        });

        it('rvisual', () => {
            const template = 'rvisual';

            testGeneratedVisualByTemplateName(template);
        });

        it('rhtml', () => {
            const template = 'rhtml';

            testGeneratedVisualByTemplateName(template);
        });

        function testGeneratedVisualByTemplateName(template) {
            let visualName = 'visualname',
                visualPath = path.join(tempPath, visualName);

            FileSystem.runPbiviz('new', visualName, `--template ${template}`);
            FileSystem.runCMDCommand('npm i', visualPath, startPath);

            //check base dir exists
            let stat = fs.statSync(visualPath);
            expect(stat.isDirectory()).toBe(true);

            //read pbiviz json generated in visual
            let pbivizJson = fs.readJsonSync(path.join(visualPath, 'pbiviz.json'));

            //check pbiviz.json config file
            let visualConfig = pbivizJson.visual;
            expect(visualConfig.name).toBe(visualName);
            expect(visualConfig.displayName).toBe(visualName);
            expect(visualConfig.guid).toBeDefined();
            expect(visualConfig.guid).toMatch(/^[a-zA-Z0-9]+$/g);
            expect(visualConfig.guid.substr(0, visualName.length)).toBe(visualName);
        }
    });

    it("Should convert multi-word visual name to camelCase", () => {
        let visualDisplayName = 'My Visual Name here';
        let visualName = 'myVisualNameHere';
        FileSystem.runPbiviz('new', visualDisplayName);

        let visualPath = path.join(tempPath, visualName);
        let stat = fs.statSync(visualPath);
        expect(stat.isDirectory()).toBe(true);

        let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
        expect(visualConfig.name).toBe(visualName);
        expect(visualConfig.displayName).toBe(visualDisplayName);
    });

    it("Should throw error if the visual name invalid", () => {
        let invalidVisualName = '12test';
        let error;
        try {
            FileSystem.runPbiviz('new', invalidVisualName);
        }
        catch (e) {
            error = e;
        }
        expect(error.message).toMatch("The visual name can't begin with a number digit");

        invalidVisualName = '\u200c';
        try {
            FileSystem.runPbiviz('new', invalidVisualName);
        }
        catch (e) {
            error = e;
        }
        expect(error.message).toMatch("The visual name can contain only letters and numbers");

        invalidVisualName = 'do';
        try {
            FileSystem.runPbiviz('new', invalidVisualName);
        }
        catch (e) {
            error = e;
        }
        expect(error.message).toMatch("The visual name cannot be equal to a reserved JavaScript keyword");

    });

    it("Should throw error if the visual already exists", () => {
        let visualName = 'visualname';
        let error;

        FileSystem.runPbiviz('new', visualName);

        try {
            FileSystem.runPbiviz('new', visualName);
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.status).toBe(1);
    });

    it("Should overwrite existing visual with force flag", () => {
        let visualName = 'visualname';
        let visualPath = path.join(tempPath, visualName);
        let visualTestFilePath = path.join(visualPath, 'testFile.txt');
        let visualNewError, testFileError1, testFileError2;

        FileSystem.runPbiviz('new', visualName);
        fs.writeFileSync(visualTestFilePath, 'hello!!');

        try {
            fs.statSync(visualTestFilePath);
        } catch (e) {
            testFileError1 = e;
        }

        try {
            FileSystem.runPbiviz('new', visualName, '-f');
        } catch (e) {
            visualNewError = e;
        }

        try {
            fs.statSync(visualTestFilePath);
        } catch (e) {
            testFileError2 = e;
        }

        expect(visualNewError).not.toBeDefined();
        expect(testFileError1).not.toBeDefined();
        expect(testFileError2).toBeDefined();
        expect(testFileError2.code).toBe('ENOENT');
    });
});

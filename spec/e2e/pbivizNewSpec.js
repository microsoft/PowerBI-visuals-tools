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
import { promises as fsPromises } from "fs";
import FileSystem from '../helpers/FileSystem.js';
import { writeMetadata, readdirSyncRecursive } from "./utils.js";
import { download, createFolder, readJsonFromRoot } from "../../lib/utils.js";

const config = readJsonFromRoot('config.json');
const tempPath = FileSystem.getTempPath();
const templatePath = FileSystem.getTemplatePath();
const startPath = process.cwd();
const visualName = 'visualName';
const visualPath = path.join(tempPath, visualName);

describe("E2E - pbiviz new", () => {

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
    });

    afterEach(() => {
        process.chdir(startPath);
    });

    afterAll(() => {
        FileSystem.deleteTempDirectory();
    });

    it("Should generate new visual with default template", () => {
        const template = 'default';

        FileSystem.runPbiviz('new', visualName, ' -t default');

        writeMetadata(visualPath);

        //check base dir
        const stat = fs.statSync(visualPath);
        expect(stat.isDirectory()).toBe(true);

        //check contents
        const expectedFiles = readdirSyncRecursive(path.join(templatePath, 'visuals', template));
        expectedFiles.concat(readdirSyncRecursive(path.join(templatePath, 'visuals', '_global')));
        expectedFiles.push('/pbiviz.json');
        const visualFiles = readdirSyncRecursive(visualPath);
        const fileDiff = [expectedFiles, visualFiles].reduce((a, b) => a.filter(c => !b.includes(c)));
        expect(fileDiff.length).toBe(0);

        // check exists node_modules directory
        const nodeModulesDirStat = fs.statSync(path.join(visualPath, "node_modules"));
        expect(nodeModulesDirStat.isDirectory()).toBe(true);

        //check pbiviz.json config file
        const visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
        expect(visualConfig.name).toBe(visualName);
        expect(visualConfig.displayName).toBe(visualName);
        expect(visualConfig.guid).toBeDefined();
        expect(visualConfig.guid).toMatch(/^[a-zA-Z0-9]+$/g);
        expect(visualConfig.guid.substr(0, visualName.length)).toBe(visualName);
    });

    describe(`Should download 'Circlecard' visual archive from the repo`, () => {
        const template = 'circlecard';

        it(`Verifiy size`, async () => {
            const folder = createFolder(template);
            const archiveSize = 10000;
            const archiveName = path.join(folder, `${template}Archive.zip`);
            await download(config.visualTemplates[template], archiveName);
            const stats = await fsPromises.stat(archiveName);
            await expect(stats.size).toBeGreaterThanOrEqual(archiveSize);
            await fsPromises.unlink(archiveName);
        });

    });

    describe('Should generate new visual using specified template', () => {

        function testGeneratedVisualByTemplateName(template) {
            FileSystem.runPbiviz('new', visualName, `--template ${template}`);
            if (template !== 'circlecard') {
                FileSystem.runCMDCommand('npm i', visualPath, startPath);
            }

            //check base dir exists
            const stat = fs.statSync(visualPath);
            expect(stat.isDirectory()).toBe(true);

            //read pbiviz json generated in visual
            const pbivizJson = fs.readJsonSync(path.join(visualPath, 'pbiviz.json'));

            //check pbiviz.json config file
            const visualConfig = pbivizJson.visual;
            if (template === 'circlecard') {
                expect(visualConfig.name).toBe('reactCircleCard');
                expect(visualConfig.displayName).toBe('ReactCircleCard');
            } else {
                expect(visualConfig.name).toBe(visualName);
                expect(visualConfig.displayName).toBe(visualName);
            }
            expect(visualConfig.guid).toBeDefined();
            expect(visualConfig.guid).toMatch(/^[a-zA-Z0-9]+$/g);
            expect(visualConfig.guid.substr(0, visualName.length)).toBe(visualName);
        }

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

        it('circlecard', () => {
            const template = 'circlecard';

            testGeneratedVisualByTemplateName(template);
        });
    });

    it("Should convert multi-word visual name to camelCase", () => {
        const visualDisplayName = 'Visual Name';
        FileSystem.runPbiviz('new', `"${visualDisplayName}"`);

        const stat = fs.statSync(visualPath);
        expect(stat.isDirectory()).toBe(true);

        const visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
        expect(visualConfig.name).toBe(visualName);
        expect(visualConfig.displayName).toBe(visualDisplayName);
    });

    it("Should throw error if the visual name invalid", () => {
        let error;
        let invalidVisualName = '12test';
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
        const visualTestFilePath = path.join(visualPath, 'testFile.txt');
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

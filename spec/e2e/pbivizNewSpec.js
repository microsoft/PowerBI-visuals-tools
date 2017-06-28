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
let wrench = require('wrench');
let _ = require('lodash');
let visualGenerator = require('../../lib/VisualGenerator.js');

let FileSystem = require('../helpers/FileSystem.js');

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

        FileSystem.runPbiviz('new', visualName);

        //check base dir
        let stat = fs.statSync(visualPath);
        expect(stat.isDirectory()).toBe(true);

        //check contents
        let expectedFiles = wrench.readdirSyncRecursive(path.join(templatePath, 'visuals', template));
        expectedFiles.concat(wrench.readdirSyncRecursive(path.join(templatePath, 'visuals', '_global')));
        expectedFiles.push('pbiviz.json');
        let visualFiles = wrench.readdirSyncRecursive(visualPath);
        let fileDiff = _.difference(expectedFiles, visualFiles);
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

    describe("Should generate correct settings.ts", () => {
        const visualName = "visualname";
        const template = "default";
        const visualPath = path.join(tempPath, visualName);
        const settingsPath = `${visualPath}/src/settings.ts`;
        const visualFilePath = `${visualPath}/src/visual.ts`;
        global.powerbi = {};
        beforeEach(() => {
            FileSystem.runPbiviz("new", visualName);
        });

        afterEach(() => {
            process.chdir(visualPath);
        });

        afterAll(() => {
            global.powerbi = undefined;
        });

        it("settings.ts was created", (done) => {
            FileSystem.expectFileToExist(settingsPath)
                .then(done)
                .catch((error) => fail(error));
        });

        it("settings.ts has export function", (done) => {
            FileSystem.expectFileToMatch(settingsPath, "export class VisualSettings extends DataViewObjectsParser")
                .then(done)
                .catch((error) => fail(error));
        });

        it("visual has import settings", (done) => {
            FileSystem.expectFileToMatch(visualFilePath, "private settings: VisualSettings;")
                .then(done)
                .catch((error) => fail(error));
        });
        it("the settings are available on the visual", (done) => {
            const defaultSettings = {
                "dataPoint": {
                    "defaultColor": "",
                    "showAllDataPoints": true,
                    "fill": "",
                    "fillRule": "",
                    "fontSize": 12
                }
            };
            const dataViews = [{
                "metadata": {
                    "columns": [],
                    "objects": {
                        "dataPoint": {
                            "defaultColor": {
                                "solid": {
                                    "color": "#A66999"
                                }
                            },
                            "fontSize": "21",
                            "fillRule": {
                                "solid": {
                                    "color": {
                                        "_kind": 17,
                                        "type": {
                                            "underlyingType": 1,
                                            "category": null
                                        },
                                        "value": "#FD625E",
                                        "valueEncoded": "'#FD625E'"
                                    }
                                }
                            },
                            "fill": {
                                "solid": {
                                    "color": "#caa5c2"
                                }
                            },
                            "showAllDataPoints": true
                        }
                    }
                }
            }];
            const fillSettings = {
                "dataPoint": {
                    "defaultColor": "#A66999",
                    "showAllDataPoints": true,
                    "fill": "#caa5c2",
                    "fillRule": {
                        "_kind": 17,
                        "type": {
                            "underlyingType": 1,
                            "category": null
                        },
                        "value": "#FD625E",
                        "valueEncoded": "'#FD625E'"
                    },
                    "fontSize": "21"
                }
            };

            process.chdir(visualPath);
            FileSystem.runCMDCommand('npm i', visualPath);
            try {
                FileSystem.runPbiviz('package', '--no-pbiviz', "--resources");
            } catch (e) {
                fail(e);
            }
            let visualCode = fs.readFile(`${visualPath}/.tmp/drop/visual.js`, 'utf8',
                (err, data) => {
                    if (err) {
                        fail(err);
                    }
                    global.eval(data); // jshint ignore:line
                    let visualFullName = Object.keys(global.powerbi.extensibility.visual)[0];
                    let settings = global.powerbi.extensibility.visual[visualFullName].VisualSettings.getDefault();
                    expect(JSON.stringify(settings)).toEqual(JSON.stringify(defaultSettings));
                    let visualInstance = new global.powerbi.extensibility.visual[visualFullName].Visual({ element: { innerHTML: null } });
                    visualInstance.update({ dataViews: dataViews });
                    expect(JSON.stringify(visualInstance.settings)).toEqual(JSON.stringify(fillSettings));
                    done();
                });
        });
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
            let version = 'v' + pbivizJson.apiVersion;

            //check that all files were created
            let versionBasePath = path.join('.api', version);
            let expectedFiles = wrench.readdirSyncRecursive(path.join(templatePath, 'visuals', template));
            expectedFiles = expectedFiles.concat(wrench.readdirSyncRecursive(path.join(templatePath, 'visuals', '_global')));
            expectedFiles.push(
                'pbiviz.json',
                '.api',
                versionBasePath,
                path.join(versionBasePath, 'PowerBI-visuals.d.ts'),
                path.join(versionBasePath, 'schema.capabilities.json'),
                path.join(versionBasePath, 'schema.dependencies.json'),
                path.join(versionBasePath, 'schema.pbiviz.json'),
                path.join(versionBasePath, 'schema.stringResources.json')
            );

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
        expect(error.message).toMatch("The visual name can't be empty");

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
            let stater = fs.statSync(visualTestFilePath);
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

    describe("--api-version flag", () => {
        it("Should generate new visual with specified version", () => {
            let visualName = 'visualname';
            let visualPath = path.join(tempPath, visualName);

            FileSystem.runPbiviz('new', visualName, '--api-version 1.0.0');

            //api version file should've been created
            let stat = fs.statSync(path.join(visualPath, '.api', 'v1.0.0'));
            expect(stat.isDirectory()).toBe(true);

            //pbiviz version number should've been updated
            let pbivizJson = fs.readJsonSync(path.join(visualPath, 'pbiviz.json'));
            expect(pbivizJson.apiVersion).toBe('1.0.0');

            //tsconfig should've been updated
            let tsConfig = fs.readJsonSync(path.join(visualPath, 'tsconfig.json'));
            let typeDefIndex = _.findIndex(tsConfig.files, i => i.match(/.api\/.+\/PowerBI-visuals.d.ts$/));
            expect(tsConfig.files[typeDefIndex]).toBe('.api/v1.0.0/PowerBI-visuals.d.ts');

            //.vscode/settings.json should've been set to the correct schemas
            let vsCodeSettings = fs.readJsonSync(path.join(visualPath, '.vscode', 'settings.json'));
            let vsCodeMatches = 0;
            vsCodeSettings['json.schemas'].forEach((item, idx) => {
                if (item.url.match(/.api\/.+\/schema.pbiviz.json$/)) {
                    expect(vsCodeSettings['json.schemas'][idx].url).toBe('./.api/v1.0.0/schema.pbiviz.json');
                    vsCodeMatches++;
                } else if (item.url.match(/.api\/.+\/schema.capabilities.json$/)) {
                    expect(vsCodeSettings['json.schemas'][idx].url).toBe('./.api/v1.0.0/schema.capabilities.json');
                    vsCodeMatches++;
                }
            });
            expect(vsCodeMatches).toBe(2);
        });

        it("Should fail with invalid version number", () => {
            let visualName = 'visualname';

            let error;

            try {
                FileSystem.runPbiviz('new', visualName, '--api-version 99.99.99');
            } catch (e) {
                error = e;
            }
            expect(error).toBeDefined();
            expect(error.status).toBe(1);
            expect(error.message).toContain("Invalid API version: 99.99.99");
        });
    });
});

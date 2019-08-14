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
const async = require('async');
const JSZip = require('jszip');
const lodashIsEqual = require('lodash.isequal');

const FileSystem = require('../helpers/FileSystem.js');
const writeMetadata = require("./utils").writeMetadata;

const tempPath = FileSystem.getTempPath();
const startPath = process.cwd();

describe("E2E - pbiviz package", () => {

    let visualName = 'visualname';
    let visualPath = path.join(tempPath, visualName);
    let visualPbiviz = {};

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName);
        process.chdir(visualPath);
        FileSystem.runCMDCommand('npm i', visualPath);

        writeMetadata(visualPath);

        visualPbiviz = JSON.parse(fs.readFileSync(path.join(visualPath, 'pbiviz.json'), { encoding: "utf8" }));
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
            FileSystem.runPbiviz('package');
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
        expect(error.status).toBe(1);
        expect(error.message).toContain("Error: pbiviz.json not found. You must be in the root of a visual project to run this command");
    });

    it("Should throw error if there is nothing to produce", () => {
        let error;
        process.chdir(tempPath);

        try {
            FileSystem.runPbiviz('package', '--no-pbiviz');
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
        expect(error.status).toBe(1);
        expect(error.message).toContain("Nothing to build. Cannot use --no-pbiviz without --resources");
    });

    it("Should create a pbiviz file and no resources folder with no flags", () => {
        FileSystem.runPbiviz('package');

        let pbivizPath = path.join(visualPath, 'dist', visualPbiviz.visual.guid + "." + visualPbiviz.visual.version + '.pbiviz');
        let resourcesPath = path.join(visualPath, 'dist', 'resources');

        let resourcesError;
        try {
            fs.accessSync(resourcesPath);
        } catch (e) {
            resourcesError = e;
        }

        expect(resourcesError).toBeDefined();
        expect(resourcesError.code).toBe('ENOENT');
        expect(fs.statSync(pbivizPath).isFile()).toBe(true);
    });

    it("Should create a pbiviz file and resource folder with --resources flag", () => {
        FileSystem.runPbiviz('package', false, '--resources');

        let pbivizPath = path.join(visualPath, 'dist', visualPbiviz.visual.guid + "." + visualPbiviz.visual.version + '.pbiviz');
        let resourcesPath = path.join(visualPath, 'dist', 'resources');

        expect(fs.statSync(pbivizPath).isFile()).toBe(true);
        expect(fs.statSync(resourcesPath).isDirectory()).toBe(true);
    });

    it("Should not create pbiviz file with --no-pbiviz flag", () => {
        FileSystem.runPbiviz('package', false, '--no-pbiviz --resources');

        let pbivizPath = path.join(visualPath, 'dist', visualPbiviz.visual.guid + "." + visualPbiviz.visual.version + '.pbiviz');
        let resourcesPath = path.join(visualPath, 'dist', 'resources');

        let pbivizError;
        try {
            fs.accessSync(pbivizPath);
        } catch (e) {
            pbivizError = e;
        }

        expect(pbivizError).toBeDefined();
        expect(pbivizError.code).toBe('ENOENT');
        expect(fs.statSync(resourcesPath).isDirectory()).toBe(true);
    });

    it("Should correctly generate pbiviz file", (done) => {
        FileSystem.runPbiviz('package');

        let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
        let visualCapabilities = fs.readJsonSync(path.join(visualPath, 'capabilities.json'));
        let pbivizPath = path.join(visualPath, 'dist', visualPbiviz.visual.guid + "." + visualPbiviz.visual.version + '.pbiviz');
        let pbivizResourcePath = `resources/${visualConfig.guid}.pbiviz.json`;

        let zipContents = fs.readFileSync(pbivizPath);
        let jszip = new JSZip();
        jszip.loadAsync(zipContents)
            .then((zip) => {
                async.parallel([
                    //check package.json
                    (next) => {
                        zip.file('package.json').async('string')
                            .then((content) => {
                                let data = JSON.parse(content);
                                expect(data.resources.length).toBe(1);
                                expect(data.resources[0].file).toBe(pbivizResourcePath);
                                expect(data.visual).toEqual(visualConfig);
                                next();
                            })
                            .catch(next);
                    },
                    //check pbiviz
                    (next) => {
                        zip.file(pbivizResourcePath).async('string')
                            .then((content) => {
                                let data = JSON.parse(content);
                                expect(data.visual).toEqual(visualConfig);
                                expect(data.capabilities).toEqual(visualCapabilities);
                                expect(data.content.js).toBeDefined();
                                expect(data.content.js.length).toBeGreaterThan(0);
                                expect(data.content.css).toBeDefined();
                                expect(data.content.iconBase64).toBeDefined();
                                expect(data.content.iconBase64.length).toBeGreaterThan(0);
                                next();
                            })
                            .catch(next);
                    }
                ], error => {
                    if (error) { throw error; }
                    done();
                });

            });
    });

    it("Should correctly generate resources folder", () => {
        FileSystem.runPbiviz('package', false, '--no-pbiviz --resources');

        let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
        let visualCapabilities = fs.readJsonSync(path.join(visualPath, 'capabilities.json'));
        let resourcesPath = path.join(visualPath, 'dist', 'resources');
        let pbivizPath = path.join(resourcesPath, visualPbiviz.visual.guid + '.pbiviz.json');

        expect(fs.statSync(resourcesPath).isDirectory()).toBe(true);
        expect(fs.statSync(path.join(resourcesPath, 'visual.prod.js')).isFile()).toBe(true);
        expect(fs.statSync(path.join(resourcesPath, 'visual.prod.css')).isFile()).toBe(true);
        expect(fs.statSync(pbivizPath).isFile()).toBe(true);

        let pbiviz = fs.readJsonSync(pbivizPath);
        expect(pbiviz.visual).toEqual(visualConfig);
        expect(pbiviz.capabilities).toEqual(visualCapabilities);
        expect(pbiviz.content.js).toBeDefined();
        expect(pbiviz.content.css).toBeDefined();
        expect(pbiviz.content.iconBase64).toBeDefined();
    });

    // tets can't check the minification, because in input the plugin gets minified version, 
    // plugin can't create two version js file for compare
    xit("Should minify assets by default", () => {
        FileSystem.runPbiviz('package', false, '--resources --no-pbiviz');

        let js = fs.statSync(path.join(visualPath, 'dist', 'resources', 'visual.js'));

        let prodJs = fs.statSync(path.join(visualPath, 'dist', 'resources', 'visual.prod.js'));

        expect(js.size).toBeGreaterThan(prodJs.size);
    });

    it("Should skip minification with --no-minify flag", () => {
        FileSystem.runPbiviz('package', false, '--resources --no-pbiviz --no-minify');

        let js = fs.statSync(path.join(visualPath, 'dist', 'resources', 'visual.js'));

        let prodJs = fs.statSync(path.join(visualPath, 'dist', 'resources', 'visual.prod.js'));

        expect(js.size).toBe(prodJs.size);
    });

    it("Should set all versions in metadata equal", (done) => {
        let visualVersion = "1.2.3";

        let pbivizJsonPath = path.join(visualPath, 'pbiviz.json');
        let pbiviz = fs.readJsonSync(pbivizJsonPath);
        pbiviz.visual.version = visualVersion;
        fs.writeFileSync(pbivizJsonPath, JSON.stringify(pbiviz));
        FileSystem.runCMDCommand('npm i', visualPath);
        FileSystem.runPbiviz('package');

        let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
        let pbivizPath = path.join(visualPath, 'dist', visualPbiviz.visual.guid + "." + pbiviz.visual.version + '.pbiviz');
        let pbivizResourcePath = `resources/${visualConfig.guid}.pbiviz.json`;

        let zipContents = fs.readFileSync(pbivizPath);
        let jszip = new JSZip();
        jszip.loadAsync(zipContents)
            .then((zip) => {
                async.parallel([
                    //check package.json
                    next => {
                        zip.file('package.json').async('string')
                            .then((content) => {
                                let data = JSON.parse(content);
                                expect(data.visual.version).toEqual(visualVersion);
                                expect(data.version).toEqual(visualVersion);
                                next();
                            })
                            .catch(next);
                    },
                    //check pbiviz
                    next => {
                        zip.file(pbivizResourcePath).async('string')
                            .then((content) => {
                                let data = JSON.parse(content);
                                expect(data.visual.version).toEqual(visualVersion);
                                next();
                            })
                            .catch(next);
                    }
                ], error => {
                    if (error) { throw error; }
                    done();
                });

            });
    });

    it("Should correctly generate pbiviz file with stringResources localization", (done) => {
        const resourceStringLocalization =
            {
                "locale": "ru-RU",
                "values": {
                    "formattingGeneral": "Общие настройки",
                    "formattingGeneralOrientation": "Ориентация",
                    "formattingGeneralOrientationVertical": "Вертикальная"
                }
            };
        const validStringResources =
            {
                "ru-RU": {
                    "formattingGeneral": "Общие настройки",
                    "formattingGeneralOrientation": "Ориентация",
                    "formattingGeneralOrientationVertical": "Вертикальная"
                }
            };

        mkDirPromise('stringResources')
            .then(() => writeJsonPromise('stringResources/ru-RU.json', resourceStringLocalization))
            .then(() => 
                readJsonPromise('pbiviz.json')
            )
            .then((pbivizJson) => {
                pbivizJson.stringResources = ["stringResources/ru-RU.json"];
                return writeJsonPromise('pbiviz.json', pbivizJson);
            })
            .then(() => 
                FileSystem.runPbiviz('package', false, '--no-pbiviz --no-minify --resources')
            )
            .then(() => 
                readJsonPromise(path.join(visualPath, 'dist', 'resources', visualPbiviz.visual.guid + '.pbiviz.json'))
            )
            .then((pbivizJson) => {
                expect(lodashIsEqual(pbivizJson.stringResources, validStringResources)).toBeTruthy();
                done();
            })
            .catch((err) => {
                expect(err).toBe(null);
                done();
            });
    });

    it("Should correctly generate pbiviz file with RESJSON localization", (done) => {
        const ResJsonEngLocalization =
            {
                "formattingGeneral": "General",
                "formattingGeneralOrientation": "Orientation",
                "formattingGeneralOrientationVertical": "Vertical"
            };
        const ResJsonRuLocalization =
            {
                "formattingGeneral": "Общие настройки",
                "formattingGeneralOrientation": "Ориентация",
                "formattingGeneralOrientationVertical": "Вертикальная"
            };

        const validStringResources =
            {
                "en-US": {
                    "formattingGeneral": "General",
                    "formattingGeneralOrientation": "Orientation",
                    "formattingGeneralOrientationVertical": "Vertical"
                },
                "ru-RU": {
                    "formattingGeneral": "Общие настройки",
                    "formattingGeneralOrientation": "Ориентация",
                    "formattingGeneralOrientationVertical": "Вертикальная"
                }
            };
        mkDirPromise('stringResources')
            .then(() =>
                Promise.all([
                    mkDirPromise('stringResources/en-US')
                        .then(() => writeJsonPromise('stringResources/en-US/resources.resjson', ResJsonEngLocalization)),
                    mkDirPromise('stringResources/ru-RU')
                        .then(() => writeJsonPromise('stringResources/ru-RU/resources.resjson', ResJsonRuLocalization))
                ]))
            .then(() => 
                FileSystem.runPbiviz('package', false, '--no-pbiviz --no-minify --resources')
            )
            .then(() => 
                readJsonPromise(path.join(visualPath, 'dist', 'resources', visualPbiviz.visual.guid + '.pbiviz.json'))
            )
            .then((pbivizJson) => {
                expect(lodashIsEqual(pbivizJson.stringResources, validStringResources)).toBeTruthy();
                done();
            })
            .catch((err) => {
                expect(err).toBe(null);
                done();
            });
    });

    it("Should correctly generate pbiviz file with RESJSON and stringResources localizations", (done) => {
        const resourceStringRuLocalization =
            {
                "locale": "ru-RU",
                "values": {
                    "formattingGeneral": "Главные настройки",
                    "formattingGeneralOrientation": "Ориентация",
                    "formattingHeaderFontColor": "Цвет шрифта",
                    "formattingHeaderBackground": "Цвет фона"
                }
            };

        const ResJsonEngLocalization =
            {
                "formattingGeneral": "General",
                "formattingGeneralOrientation": "Orientation",
                "formattingGeneralOrientationVertical": "Vertical"
            };
        const ResJsonRuLocalization =
            {
                "formattingGeneral": "Общие настройки",
                "formattingGeneralOrientation": "Ориентация",
                "formattingGeneralOrientationVertical": "Вертикальная"
            };

        const validStringResources =
            {
                "en-US": {
                    "formattingGeneral": "General",
                    "formattingGeneralOrientation": "Orientation",
                    "formattingGeneralOrientationVertical": "Vertical"
                },
                "ru-RU": {
                    "formattingGeneral": "Общие настройки",
                    "formattingGeneralOrientation": "Ориентация",
                    "formattingHeaderFontColor": "Цвет шрифта",
                    "formattingHeaderBackground": "Цвет фона",
                    "formattingGeneralOrientationVertical": "Вертикальная"
                }
            };

        mkDirPromise('stringResources')
            .then(() =>
                Promise.all([
                    mkDirPromise('stringResources/en-US')
                        .then(() => writeJsonPromise('stringResources/en-US/resources.resjson', ResJsonEngLocalization)),
                    mkDirPromise('stringResources/ru-RU')
                        .then(() => writeJsonPromise('stringResources/ru-RU/resources.resjson', ResJsonRuLocalization)),
                    writeJsonPromise('stringResources/ru-RU.json', resourceStringRuLocalization)
                ]))
            .then(() => readJsonPromise('pbiviz.json'))
            .then((pbivizJson) => {
                pbivizJson.stringResources = ["stringResources/ru-RU.json"];
                return writeJsonPromise('pbiviz.json', pbivizJson);
            })
            .then(() => 
                FileSystem.runPbiviz('package', false, '--no-pbiviz --no-minify --resources')
            )
            .then(() => readJsonPromise(path.join(visualPath, 'dist', 'resources', visualPbiviz.visual.guid + '.pbiviz.json')))
            .then((pbivizJson) => {
                expect(lodashIsEqual(pbivizJson.stringResources, validStringResources)).toBeTruthy();
                done();
            })
            .catch((err) => {
                expect(err).toBe(null);
                done();
            });
    });

});

function mkDirPromise(path) {
    return new Promise((resolve, reject) => fs.mkdir(path, (err) => {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
    }));
}

function readJsonPromise(path) {
    return new Promise((resolve, reject) => fs.readJSON(path, (err, jsonObject) => {
        if (err) {
            reject(err);
        } else {
            resolve(jsonObject);
        }
    }));
}

function writeJsonPromise(path, jsonObject) {
    return new Promise((resolve, reject) => fs.writeJSON(path, jsonObject, (err) => {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
    }));
}

function testMissingScript(fname) {
    let error;
    fs.unlinkSync(fname);

    try {
        FileSystem.runPbiviz('package');
    } catch (e) {
        error = e;
    }
    expect(error).toBeDefined();
    expect(error.status).toBe(1);
    expect(error.message).toContain("Failed updating visual capabilities");
}

function testErrorInDependencies() {
    let error;
    let invalidDependencies = [
        {
            invalidPropertyName: "ddd"
        }
    ];

    fs.writeFileSync('dependencies.json', JSON.stringify(invalidDependencies));

    try {
        FileSystem.runPbiviz('package');
    } catch (e) {
        error = e;
    }
    expect(error).toBeDefined();
    expect(error.status).toBe(1);
    expect(error.message).toContain("JSON  dependencies.json :  instance is not of a type(s) object");
}

function testPbivizPackage(done, visualPath, visualName, scriptSourceDefault, removeDependencies) {
    if (removeDependencies) {
        fs.unlinkSync('dependencies.json');
    }

    FileSystem.runPbiviz('package');

    let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
    let visualCapabilities = fs.readJsonSync(path.join(visualPath, 'capabilities.json'));
    let pbivizPath = path.join(visualPath, 'dist', visualName + '.pbiviz');
    let pbivizResourcePath = `resources/${visualConfig.guid}.pbiviz.json`;

    visualCapabilities.dataViewMappings[0].scriptResult.script.scriptSourceDefault = scriptSourceDefault;

    let dependencies = '';
    if (!removeDependencies) {
        dependencies = fs.readJsonSync(path.join(visualPath, 'dependencies.json'));
    }

    let zipContents = fs.readFileSync(pbivizPath);
    let jszip = new JSZip();
    jszip.loadAsync(zipContents)
        .then((zip) => {
            async.parallel([
                //check package.json
                (next) => {
                    zip.file('package.json').async('string')
                        .then((content) => {
                            let data = JSON.parse(content);
                            expect(data.resources.length).toBe(1);
                            expect(data.resources[0].file).toBe(pbivizResourcePath);
                            expect(data.visual).toEqual(visualConfig);
                            next();
                        })
                        .catch(next);
                },
                //check pbiviz
                (next) => {
                    zip.file(pbivizResourcePath).async('string')
                        .then((content) => {
                            let data = JSON.parse(content);
                            expect(data.visual).toEqual(visualConfig);
                            expect(data.capabilities).toEqual(visualCapabilities);
                            expect(data.content.js).toBeDefined();
                            expect(data.content.css).toBeDefined();
                            expect(data.content.iconBase64).toBeDefined();
                            if (!removeDependencies) {
                                expect(data.dependencies).toEqual(dependencies);
                            }
                            next();
                        })
                        .catch(next);
                }
            ], error => {
                if (error) { throw error; }
                done();
            });

        });
}

// new tools doesn't support R visuals build. coming soon
xdescribe("E2E - pbiviz package for R Visual template", () => {

    let visualName = 'visualname';
    let visualPath = path.join(tempPath, visualName);

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName, '--template rvisual');
        process.chdir(visualPath);
        FileSystem.runCMDCommand('npm i', visualPath);
    });

    afterEach(() => {
        process.chdir(startPath);
    });

    afterAll(() => {
        process.chdir(startPath);
        FileSystem.deleteTempDirectory();
    });

    it("Should throw error if script.r file is missing", () => {
        testMissingScript('script.r');
    });

    it("Should throw error if dependencies file is not valid", () => {
        testErrorInDependencies();
    });

    it("Should correctly generate pbiviz file for R Visual template - no dependencies file", (done) => {
        let scriptSourceDefault = fs.readFileSync(path.join(visualPath, 'script.r')).toString();
        let removeDependencies = true;
        testPbivizPackage(done, visualPath, visualName, scriptSourceDefault, removeDependencies);
    });

    it("Should correctly generate pbiviz file for R Visual template", (done) => {
        let scriptSourceDefault = fs.readFileSync(path.join(visualPath, 'script.r')).toString();
        let removeDependencies = false;
        testPbivizPackage(done, visualPath, visualName, scriptSourceDefault, removeDependencies);
    });
});

// new tools doesn't support R visuals build. coming soon
xdescribe("E2E - pbiviz package for R HTML template", () => {

    let visualName = 'visualname';
    let visualPath = path.join(tempPath, visualName);

    function getScriptSourceDefault() {
        let FlattenScriptContent = fs.readFileSync(path.join(visualPath, 'r_files/flatten_HTML.r')).toString();
        let scriptContent = fs.readFileSync(path.join(visualPath, 'script.r')).toString();
        let pattern = "source('./r_files/flatten_HTML.r')";
        return scriptContent.replace(pattern, FlattenScriptContent);
    }

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName, '--template rhtml');
        process.chdir(visualPath);
        FileSystem.runCMDCommand('npm i', visualPath);
    });

    afterEach(() => {
        process.chdir(startPath);
    });

    afterAll(() => {
        process.chdir(startPath);
        FileSystem.deleteTempDirectory();
    });

    it("Should throw error if script.r file is missing", () => {
        testMissingScript('script.r');
    });

    it("Should throw error if flatten_HTML.r file is missing", () => {
        testMissingScript('r_files/flatten_HTML.r');
    });

    it("Should throw error if dependencies file is not valid", () => {
        testErrorInDependencies();
    });

    it("Should correctly generate pbiviz file for R HTML template - no dependencies file", (done) => {
        let scriptSourceDefault = getScriptSourceDefault();
        let removeDependencies = true;
        testPbivizPackage(done, visualPath, visualName, scriptSourceDefault, removeDependencies);
    });

    it("Should correctly generate pbiviz file for R HTML template", (done) => {
        let scriptSourceDefault = getScriptSourceDefault();
        let removeDependencies = false;
        testPbivizPackage(done, visualPath, visualName, scriptSourceDefault, removeDependencies);
    });
});

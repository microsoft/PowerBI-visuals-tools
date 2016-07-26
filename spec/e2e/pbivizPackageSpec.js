"use strict";

let fs = require('fs-extra');
let path = require('path');
let async = require('async');
let JSZip = require('jszip');

let FileSystem = require('../helpers/FileSystem.js');

const tempPath = FileSystem.getTempPath();
const templatePath = FileSystem.getTemplatePath();
const startPath = process.cwd();

describe("E2E - pbiviz package", () => {

    let visualName = 'visualname';
    let visualPath = path.join(tempPath, visualName);

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName);
        process.chdir(visualPath);
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

        let pbivizPath = path.join(visualPath, 'dist', visualName + '.pbiviz');
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

        let pbivizPath = path.join(visualPath, 'dist', visualName + '.pbiviz');
        let resourcesPath = path.join(visualPath, 'dist', 'resources');

        expect(fs.statSync(pbivizPath).isFile()).toBe(true);
        expect(fs.statSync(resourcesPath).isDirectory()).toBe(true);
    });

    it("Should not create pbiviz file with --no-pbiviz flag", () => {
        FileSystem.runPbiviz('package', false, '--no-pbiviz --resources');

        let pbivizPath = path.join(visualPath, 'dist', visualName + '.pbiviz');
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
        let pbivizPath = path.join(visualPath, 'dist', visualName + '.pbiviz');
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
                                expect(data.content.css).toBeDefined();
                                expect(data.content.iconBase64).toBeDefined();
                                next();
                            })
                            .catch(next);
                    },
                ], error => {
                    if (error) throw error;
                    done();
                });

            });
    });

    it("Should correctly generate resources folder", () => {
        FileSystem.runPbiviz('package', false, '--no-pbiviz --resources');

        let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
        let visualCapabilities = fs.readJsonSync(path.join(visualPath, 'capabilities.json'));
        let resourcesPath = path.join(visualPath, 'dist', 'resources');
        let pbivizPath = path.join(resourcesPath,'pbiviz.json');

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

    it("Should minify assets by default", () => {
        FileSystem.runPbiviz('package');

        let js = fs.statSync(path.join(visualPath, '.tmp', 'drop', 'visual.js'));
        let css = fs.statSync(path.join(visualPath, '.tmp', 'drop', 'visual.css'));

        let prodJs = fs.statSync(path.join(visualPath, '.tmp', 'drop', 'visual.prod.js'));
        let prodCss = fs.statSync(path.join(visualPath, '.tmp', 'drop', 'visual.prod.css'));

        expect(js.size).toBeGreaterThan(prodJs.size);
        expect(css.size).toBeGreaterThan(prodCss.size);
    });    

    it("Should skip minification with --no-minify flag", () => {
        FileSystem.runPbiviz('package', false, '--no-minify');

        let js = fs.statSync(path.join(visualPath, '.tmp', 'drop', 'visual.js'));
        let css = fs.statSync(path.join(visualPath, '.tmp', 'drop', 'visual.css'));

        let prodJs = fs.statSync(path.join(visualPath, '.tmp', 'drop', 'visual.prod.js'));
        let prodCss = fs.statSync(path.join(visualPath, '.tmp', 'drop', 'visual.prod.css'));

        expect(js.size).toBe(prodJs.size);
        expect(css.size).toBe(prodCss.size);
    });

});
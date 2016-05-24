"use strict";

var fs = require('fs-extra');
var path = require('path');
var wrench = require('wrench');
var _ = require('lodash');

var FileSystem = require('../helpers/FileSystem.js');

const tempPath = FileSystem.getTempPath();
const templatePath = FileSystem.getTemplatePath();
const startPath = process.cwd();

describe("E2E - pbiviz info", function () {

    let visualName = 'myuniquevisualnamegoeshere';
    let visualPath = path.join(tempPath, visualName);

    beforeEach(function () {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName);
        process.chdir(visualPath);
    });

    afterEach(function () {
        process.chdir(startPath);
    });

    afterAll(function () {
        process.chdir(startPath);
        FileSystem.deleteTempDirectory();
    });

    it("Should output visual info", function () {
        var output = FileSystem.runPbiviz('info').toString();
        var visualConfig = require(path.join(visualPath, 'pbiviz.json')).visual;
        expect(output).toContain(visualName);
        expect(output).toContain(visualConfig.guid);
    });
    
    it("Should throw error if not in the visual root", function () {
        var error;
        process.chdir(tempPath);
        
        try {
            FileSystem.runPbiviz('info');
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.status).toBe(1);
    });    

});
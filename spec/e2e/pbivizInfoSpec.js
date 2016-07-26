"use strict";

let fs = require('fs-extra');
let path = require('path');

let FileSystem = require('../helpers/FileSystem.js');

const tempPath = FileSystem.getTempPath();
const startPath = process.cwd();

describe("E2E - pbiviz info", () => {

    let visualName = 'myuniquevisualnamegoeshere';
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
            FileSystem.runPbiviz('info');
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.status).toBe(1);
        expect(error.message).toContain("Error: pbiviz.json not found. You must be in the root of a visual project to run this command");
    });

    it("Should output visual info", () => {
        let output = FileSystem.runPbiviz('info').toString();
        let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
        expect(output).toContain(visualName);
        expect(output).toContain(visualConfig.guid);
    });
});

"use strict";

let fs = require('fs-extra');
let path = require('path');
let async = require('async');
let JSZip = require('jszip');
let request = require('request');

let FileSystem = require('../helpers/FileSystem.js');

const tempPath = FileSystem.getTempPath();
const startPath = process.cwd();

describe("E2E - pbiviz start", () => {

    let visualName = 'visualname';
    let visualPath = path.join(tempPath, visualName);
    let dropPath = path.join(visualPath, '.tmp', 'drop');
    let assetFiles = ['visual.js', 'visual.css', 'pbiviz.json', 'status'];

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName);
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

        try {
            FileSystem.runPbiviz('start');
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
        expect(error.status).toBe(1);
        expect(error.message).toContain("Error: pbiviz.json not found. You must be in the root of a visual project to run this command");
    });

    describe("Build and Server", () => {
        let pbivizProc;

        beforeEach(() => {
            process.chdir(visualPath);
            pbivizProc = FileSystem.runPbivizAsync('start');
            pbivizProc.stderr.on('data', (data) => {
                throw new Error(data.toString());
            });
        });

        it("Should build visual and generate resources in drop folder", (done) => {
            let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
            let visualCapabilities = fs.readJsonSync(path.join(visualPath, 'capabilities.json'));
            pbivizProc.stdout.on('data', (data) => {
                let dataStr = data.toString();
                if (dataStr.indexOf("Server listening on port 8080") !== -1) {
                    //check files on filesystem
                    expect(fs.statSync(dropPath).isDirectory()).toBe(true);
                    assetFiles.forEach(file => {
                        let filePath = path.join(dropPath, file);
                        expect(fs.statSync(filePath).isFile()).toBe(true);
                    });
                    //check metadata
                    let pbivizPath = path.join(dropPath, 'pbiviz.json');
                    let pbiviz = fs.readJsonSync(pbivizPath);
                    //should append "_DEBUG" to guid to avoid collisions
                    visualConfig.guid += "_DEBUG";
                    expect(pbiviz.visual).toEqual(visualConfig);
                    expect(pbiviz.capabilities).toEqual(visualCapabilities);
                    expect(pbiviz.content.js).toBeDefined();
                    expect(pbiviz.content.css).toBeDefined();
                    expect(pbiviz.content.iconBase64).toBeDefined();
                    pbivizProc.kill('SIGTERM');
                }

                pbivizProc.on('close', (error, message) => {
                    if (error) throw error;
                    expect(message).toBe('SIGTERM');
                    done();
                });
            });
        });

        it("Should serve files from drop folder on port 8080", (done) => {
            pbivizProc.stdout.on('data', (data) => {
                let dataStr = data.toString();
                if (dataStr.indexOf("Server listening on port 8080") !== -1) {
                    async.each(
                        assetFiles,
                        (file, next) => {
                            let filePath = path.join(dropPath, file);
                            request({
                                url: 'https://localhost:8080/assets/' + file,
                                //allow self signed cert
                                strictSSL: false
                            }, (error, response, body) => {
                                expect(error).toBeNull();
                                expect(response.statusCode).toBe(200);
                                expect(body).toBe(fs.readFileSync(filePath).toString());
                                next();
                            });
                        },
                        error => {
                            if (error) throw error;
                            pbivizProc.kill('SIGTERM');
                        }
                    );

                }
            });

            pbivizProc.on('close', (error, message) => {
                if (error) throw error;
                expect(message).toBe('SIGTERM');
                done();
            });
        });

        it("Should rebuild files on change and update status", (done) => {
            let statusPath = path.join(dropPath, 'status');
            let lastStatus;
            let tsChangeCount = 0;
            let lessChangeCount = 0;
            let jsonChangeCount = 0;

            function getStatus() {
                return fs.readFileSync(statusPath);
            }

            pbivizProc.stdout.on('data', (data) => {
                let dataStr = data.toString();

                if (dataStr.indexOf("Server listening on port 8080") !== -1) {
                    expect(tsChangeCount).toBe(0);
                    expect(lessChangeCount).toBe(0);
                    expect(jsonChangeCount).toBe(0);
                    lastStatus = getStatus();

                    //trigger ts change
                    let tsSrcPath = path.join(visualPath, 'src/visual.ts');
                    fs.appendFileSync(tsSrcPath, '// appended to ts file');
                }

                if (dataStr.indexOf('Typescript build complete') !== -1) {
                    tsChangeCount++;
                    expect(tsChangeCount).toBe(1);
                    expect(lessChangeCount).toBe(0);
                    expect(jsonChangeCount).toBe(0);
                    let status = getStatus();
                    expect(status).not.toBe(lastStatus);
                    lastStatus = status;

                    //trigger less change
                    let lessSrcPath = path.join(visualPath, 'style/visual.less');
                    fs.appendFileSync(lessSrcPath, '/* appended to less file */');                    
                }

                if (dataStr.indexOf('Less build complete') !== -1) {
                    lessChangeCount++;
                    expect(tsChangeCount).toBe(1);
                    expect(lessChangeCount).toBe(1);
                    expect(jsonChangeCount).toBe(0);
                    let status = getStatus();
                    expect(status).not.toBe(lastStatus);
                    lastStatus = status;

                    //trigger json change
                    let capabilitiesPath = path.join(visualPath, 'capabilities.json');
                    let visualCapabilities = fs.readJsonSync(capabilitiesPath);
                    visualCapabilities.dataRoles.pop();
                    fs.writeJsonSync(capabilitiesPath, visualCapabilities);
                }          

                if (dataStr.indexOf('JSON build complete') !== -1) {
                    jsonChangeCount++;
                    expect(tsChangeCount).toBe(1);
                    expect(lessChangeCount).toBe(1);
                    expect(jsonChangeCount).toBe(1);
                    let status = getStatus();
                    expect(status).not.toBe(lastStatus);
                    lastStatus = status;

                    //the end
                    pbivizProc.kill('SIGTERM');                    
                }                      
            });

            pbivizProc.on('close', (error, message) => {
                if (error) throw error;
                expect(message).toBe('SIGTERM');
                done();
            });
        });
    });

    it("Should serve files from drop folder on custom port with -p flag", (done) => {
        process.chdir(visualPath);
        let pbivizProc = FileSystem.runPbivizAsync('start', ['-p', '3333']);
        pbivizProc.stderr.on('data', (data) => {
            throw new Error(data.toString());
        });
        pbivizProc.stdout.on('data', (data) => {
            let dataStr = data.toString();

            if (dataStr.indexOf("Server listening on port 3333") !== -1) {
                async.each(
                    assetFiles,
                    (file, next) => {
                        let filePath = path.join(dropPath, file);
                        request({
                            url: 'https://localhost:3333/assets/' + file,
                            //allow self signed cert
                            strictSSL: false
                        }, (error, response, body) => {
                            expect(error).toBeNull();
                            expect(response.statusCode).toBe(200);
                            expect(body).toBe(fs.readFileSync(filePath).toString());
                            next();
                        });
                    },
                    error => {
                        if (error) throw error;
                        pbivizProc.kill('SIGTERM');
                    }
                );

            }
        });

        pbivizProc.on('close', (error, message) => {
            if (error) throw error;
            expect(message).toBe('SIGTERM');
            done();
        });
    });

});

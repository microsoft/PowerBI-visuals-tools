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
let async = require('async');
let JSZip = require('jszip');
let request = require('request');

let FileSystem = require('../helpers/FileSystem.js');

const tempPath = FileSystem.getTempPath();
const startPath = process.cwd();

//these tests can take a bit longer
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

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
                    FileSystem.killProcess(pbivizProc, 'SIGTERM');
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
                            FileSystem.killProcess(pbivizProc, 'SIGTERM');
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
                    FileSystem.killProcess(pbivizProc, 'SIGTERM');                    
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
                        FileSystem.killProcess(pbivizProc, 'SIGTERM');
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

describe("E2E - pbiviz start for R Visuals", () => {

    let visualName = 'visualname';
    let visualPath = path.join(tempPath, visualName);
    let dropPath = path.join(visualPath, '.tmp', 'drop');
    let assetFiles = ['visual.js', 'visual.css', 'pbiviz.json', 'status'];

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName, '--template rvisual --api-version 1.2.0');
    });

    afterEach(() => {
        process.chdir(startPath);
    });

    afterAll(() => {
        process.chdir(startPath);
        FileSystem.deleteTempDirectory();
    });

    describe("Build and Server for R Visuals", () => {
        let pbivizProc;

        beforeEach(() => {
            process.chdir(visualPath);
            pbivizProc = FileSystem.runPbivizAsync('start');
            pbivizProc.stderr.on('data', (data) => {
                throw new Error(data.toString());
            });
        });

        it("Should rebuild files on change and update status for R Visuals", (done) => {
            let statusPath = path.join(dropPath, 'status');
            let lastStatus;
            let rChangeCount = 0;

            function getStatus() {
                return fs.readFileSync(statusPath);
            }

            pbivizProc.stdout.on('data', (data) => {
                let dataStr = data.toString();
                if (dataStr.indexOf("Server listening on port 8080") !== -1) {
                    expect(rChangeCount).toBe(0);
                    lastStatus = getStatus();

                    //trigger r change
                    let rScriptPath = path.join(visualPath, 'script.r');
                    fs.appendFileSync(rScriptPath, '// appended to R file');
                }

                if (dataStr.indexOf('RScript build complete') !== -1) {
                    rChangeCount++;
                    expect(rChangeCount).toBe(1);
                    let status = getStatus();
                    expect(status).not.toBe(lastStatus);
                    lastStatus = status;

                    //the end
                    FileSystem.killProcess(pbivizProc, 'SIGTERM');    
                }
            });

            pbivizProc.on('close', (error, message) => {
                if (error) throw error;
                expect(message).toBe('SIGTERM');
                done();
            });
        });
    });
});

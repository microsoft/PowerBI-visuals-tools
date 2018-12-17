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
const request = require('request');

const FileSystem = require('../helpers/FileSystem.js');
const writeMetadata = require("./utils").writeMetadata;

const tempPath = FileSystem.getTempPath();
const startPath = process.cwd();

// these tests can take a bit longer
jasmine.DEFAULT_TIMEOUT_INTERVAL = 180000;
const PBIVIZ_TIMEOUT = 10000;

describe("E2E - pbiviz start", () => {
    const visualName = 'visualname';
    const visualPath = path.join(tempPath, visualName);
    const tmpPath = path.join(visualPath, '.tmp');
    const dropPath = path.join(tmpPath, 'drop');
    const assetFiles = ['visual.js', 'visual.css', 'pbiviz.json', 'status'];

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName, '--force');
        FileSystem.runCMDCommand('npm i', visualPath, tempPath);

        writeMetadata(visualPath);
    });

    afterEach(() => {
        process.chdir(startPath);
    });

    afterAll(() => {
        process.chdir(startPath);
        FileSystem.deleteTempDirectory();
    });

    xit("Should throw error if not in the visual root", () => {
        let error;

        try {
            FileSystem.runPbiviz('start', "-d");
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
        expect(error.status).toBe(1);
        expect(error.message).toContain("Error: pbiviz.json not found. You must be in the root of a visual project to run this command");
    });

    xit("Should build visual with API 1.5 and check that it is started correctly (string resources doesn't exist)", (done) => {
        const visualName = 'api150visual';
        const visualPath = path.join(tempPath, visualName);

        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName, '--api-version 1.5.0 -t default1');

        //api version file should've been created
        
        process.chdir(visualPath);

        let pbivizProc;
        pbivizProc = FileSystem.runPbivizAsync("start", "-d");
        let callbackCalled = false;
        pbivizProc.stdout.on('data', (data) => {
            let dataStr = data.toString();
            if (dataStr.indexOf("Compiled successfully") !== -1 || dataStr.match(/Compiled with\s*(\d)* warnings/) !== null) {
                if (callbackCalled) {
                    return;
                }
                callbackCalled = true;
                //the end
                FileSystem.killProcess(pbivizProc, 'SIGTERM', (error) => {
                    expect(error).toBeNull();
                    done();
                });
            }
        });
        pbivizProc.stderr.on('data', (data) => {
            if (data.toString().indexOf("DeprecationWarning") === -1) {
                throw new Error(data.toString());
            }
        });
    });

    xit("Should build visual with API 1.6 and check that it is started correctly (string resources exists)", (done) => {
        const visualName = 'api150visual';
        const visualPath = path.join(tempPath, visualName);

        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName, '--api-version 1.6.0 -t default1');

        process.chdir(visualPath);

        let pbivizProc;
        pbivizProc = FileSystem.runPbivizAsync('start');
        let callbackCalled = false;
        pbivizProc.stdout.on('data', (data) => {
            let dataStr = data.toString();
            if (dataStr.indexOf("Compiled successfully") !== -1 || dataStr.match(/Compiled with\s*(\d)* warnings/) !== null) {
                if (callbackCalled) {
                    return;
                }
                callbackCalled = true;
                // the end
                FileSystem.killProcess(pbivizProc, 'SIGTERM', (error) => {
                    expect(error).toBeNull();
                    done();
                });
            }
        });
        pbivizProc.stderr.on('data', (data) => {
            if (data.toString().indexOf("DeprecationWarning") === -1) {
                throw new Error(data.toString());
            }
        });
    });

    describe("Build and Server", () => {
        let pbivizProc;

        beforeEach(() => {
            process.chdir(visualPath);
            pbivizProc = FileSystem.runPbivizAsync("start", "-d");
            pbivizProc.stderr.on('data', (data) => {
                if (data.indexOf("For better development experience") !== -1) {
                    return;
                }
                if (data.indexOf("https://microsoft.github.io/") !== -1) {
                    return;
                }
                if (data.toString().indexOf("DeprecationWarning") !== -1) {
                    return;
                }
                if (data.toString().indexOf("warn   No such file or directory") !== -1) {
                    return;
                }
                throw new Error(data.toString());
            });
            pbivizProc.on('error', (error) => {
                throw new Error(error.toString());
            });
        });

        it("Should build visual and generate resources in drop folder", (done) => {
            let visualConfig = fs.readJsonSync(path.join(visualPath, 'pbiviz.json')).visual;
            let visualCapabilities = fs.readJsonSync(path.join(visualPath, 'capabilities.json'));
            let callbackCalled = false;
            pbivizProc.stdout.on('data', (data) => {
                let dataStr = data.toString();
                if (dataStr.indexOf("Compiled successfully") !== -1 || dataStr.match(/Compiled with\s*(\d)* warnings/) !== null) {
                    if (callbackCalled) {
                        return;
                    }
                    callbackCalled = true;
                    // need to wait while tools generate files
                    setTimeout(() => {
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
                        FileSystem.killProcess(pbivizProc, 'SIGTERM', (error) => {
                            expect(error).toBeNull();
                            done();
                        });
                    }, PBIVIZ_TIMEOUT);
                }
            });
        });

        it("Should serve files from drop folder on port 8080", (done) => {
            let callbackCalled = false;
            pbivizProc.stdout.on('data', (data) => {
                let dataStr = data.toString();
                if (dataStr.indexOf("Compiled successfully") !== -1 || dataStr.match(/Compiled with\s*(\d)* warnings/) !== null) {
                    if (callbackCalled) {
                        return;
                    }
                    callbackCalled = true;
                    // need to wait while tools generate files
                    setTimeout(() => {
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
                                if (error) { throw error; }
                                FileSystem.killProcess(pbivizProc, 'SIGTERM', (error) => {
                                    expect(error).toBeNull();
                                    done();
                                });
                            }
                        );
                    }, PBIVIZ_TIMEOUT);
                }
            });
        });

        // TODO rewrite this UT because build sequence is different
        xit("Should rebuild files on change and update status", (done) => {
            let statusPath = path.join(dropPath, 'status');
            let lastStatus;
            let tsChangeCount = 0;
            let lessChangeCount = 0;
            let jsonChangeCount = 0;

            function getStatus() {
                return fs.readFileSync(statusPath);
            }

            let callbackCalled = false;
            pbivizProc.stdout.on('data', (data) => {
                let dataStr = data.toString();
                if (dataStr.indexOf("Compiled successfully") !== -1 || dataStr.match(/Compiled with\s*(\d)* warnings/) !== null) {
                    if (callbackCalled) {
                        return;
                    }
                    callbackCalled = true;
                    expect(tsChangeCount).toBe(0);
                    expect(lessChangeCount).toBe(0);
                    expect(jsonChangeCount).toBe(0);
                    lastStatus = getStatus();

                    //trigger ts change
                    let tsSrcPath = path.join(visualPath, 'src/visual.ts');
                    fs.appendFileSync(tsSrcPath, '// appended to ts file');
                }

                if (dataStr.indexOf('Visual rebuild completed') !== -1) {
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
                    FileSystem.killProcess(pbivizProc, 'SIGTERM', (error) => {
                        expect(error).toBeNull();
                        done();
                    });
                }
            });
        });
    });

    // custom port wans't implemented in new tools
    xit("Should serve files from drop folder on custom port with -p flag", (done) => {
        process.chdir(visualPath);
        let pbivizProc = FileSystem.runPbivizAsync('start', ['-p', '3333']);
        pbivizProc.stderr.on('data', (data) => {
            if (data.toString().indexOf("DeprecationWarning") === -1) {
                throw new Error(data.toString());
            }
        });
        let callbackCalled = false;
        pbivizProc.stdout.on('data', (data) => {
            let dataStr = data.toString();

            if (dataStr.indexOf("Compiled successfully") !== -1 || dataStr.match(/Compiled with\s*(\d)* warnings/) !== null) {
                if (callbackCalled) {
                    return;
                }
                callbackCalled = true;
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
                        if (error) { throw error; }
                        FileSystem.killProcess(pbivizProc, 'SIGTERM', (error) => {
                            expect(error).toBeNull();
                            done();
                        });
                    }
                );

            }
        });
    });

});

describe("E2E - pbiviz start for R Visuals", () => {

    let visualName = 'visualname';
    let visualPath = path.join(tempPath, visualName);
    let dropPath = path.join(visualPath, '.tmp', 'drop');

    beforeEach(() => {
        FileSystem.resetTempDirectory();
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName, '--template rvisual');
    });

    afterEach(() => {
        process.chdir(startPath);
    });

    afterAll(() => {
        process.chdir(startPath);
        FileSystem.deleteTempDirectory();
    });

    // todo check R visuals build
    xdescribe("Build and Server for R Visuals", () => {
        let pbivizProc;

        beforeEach(() => {
            process.chdir(visualPath);
            FileSystem.runCMDCommand('npm i', visualPath);
            pbivizProc = FileSystem.runPbivizAsync('start');
            pbivizProc.stderr.on('data', (data) => {
                if (data.toString().indexOf("DeprecationWarning") === -1) {
                    throw new Error(data.toString());
                }
            });
        });

        it("Should rebuild files on change and update status for R Visuals", (done) => {
            let statusPath = path.join(dropPath, 'status');
            let lastStatus;
            let rChangeCount = 0;

            function getStatus() {
                return fs.readFileSync(statusPath);
            }

            let callbackCalled = false;
            pbivizProc.stdout.on('data', (data) => {
                let dataStr = data.toString();
                if (dataStr.indexOf("Compiled successfully") !== -1 || dataStr.match(/Compiled with\s*(\d)* warnings/) !== null) {
                    if (callbackCalled) {
                        return;
                    }
                    callbackCalled = true;
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
                    FileSystem.killProcess(pbivizProc, 'SIGTERM', (error) => {
                        expect(error).toBeNull();
                        done();
                    });
                }
            });
        });
    });
});

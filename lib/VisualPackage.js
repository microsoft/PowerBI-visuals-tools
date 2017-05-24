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
let VisualGenerator = require('../lib/VisualGenerator');
let childProcess = require('child_process');
let ConsoleWriter = require('../lib/ConsoleWriter');

const CONFIG_FILE = 'pbiviz.json';

/**
 * Represents an instance of a visual package based on file path
 */
class VisualPackage {
    /**
     * Creates a new visual package
     * 
     * @param {string} rootPath - file path to root of visual package
     * @param {string} visualName - name of the visual to create in the rootPath
     * @param {object} generateOptions - options for the visual generator
     * <VisualPackage>} - instance of newly created visual package
     */
    static createVisualPackage(rootPath, visualName, generateOptions) {
        return VisualGenerator.generate(rootPath, visualName, generateOptions)
            .then((visualPath) =>
                VisualPackage.installPackages(visualPath)
                    .then(() => visualPath)
            )
            .then((visualPath) => VisualPackage.loadVisualPackage(visualPath));
    }

    /**
     * Loads an instance of a visual package from a file path
     * 
     * @param {string} rootPath - file path to root of visual package
     * @returns {Promise<VisualPackage>} - instance of newly created visual package
     */
    static loadVisualPackage(rootPath) {
        return new Promise((resolve, reject) => {
            try {
                resolve(new VisualPackage(rootPath));
            } catch (e) {
                if (e && e.code && e.code === 'ENOENT') {
                    return reject(new Error(CONFIG_FILE + ' not found. You must be in the root of a visual project to run this command.'));
                }
                reject(e);
            }
        });
    }

    /**
     * Install npm dependencies for visual
     * @param {string} rootPath - file path to root of visual package
     * @static
     * @returns {Promise<void>}
     * @memberof VisualPackage
     */
    static installPackages(visualPath) {
        return new Promise(function (resolve, reject) {
            ConsoleWriter.info('Installing packages...');
            childProcess.exec(`npm install`, { cwd: visualPath },
                (err) => {
                    if (err) {
                        reject(new Error('Package install failed.'));
                    } else {
                        ConsoleWriter.info('Installed packages.');
                        resolve();
                    }
                });
        });
    }

    /**
     * Creates a VisualPackage instance
     * 
     * @param {string} rootPath - file path to root of visual package
     */
    constructor(rootPath) {
        this.basePath = rootPath;
        this.config = fs.readJsonSync(this.buildPath(CONFIG_FILE));
    }

    /**
     * Builds a path starting from the package base path
     * 
     * @param {...*} arguments - arguments passed through to path.join
     */
    buildPath() {
        return path.join.apply(this, [this.basePath].concat(Array.from(arguments)));
    }
}

module.exports = VisualPackage;

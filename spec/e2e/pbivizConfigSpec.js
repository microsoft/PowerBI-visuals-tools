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

import { createRequire } from 'module';
import fs from 'fs-extra';
import path from 'path';
import FileSystem from '../helpers/FileSystem.js';
import { writeMetadataAsJsFile } from "./testUtils.js";

const require = createRequire(import.meta.url);
const tempPath = path.join(FileSystem.getTempPath(), path.basename(import.meta.url));
const startPath = process.cwd();

describe("E2E - pbiviz JS config", () => {

    const visualName = 'myjsvisualname';
    const visualPath = path.join(tempPath, visualName);

    beforeEach(() => {
        process.chdir(startPath);
        FileSystem.resetDirectory(tempPath);
        process.chdir(tempPath);
        FileSystem.runPbiviz('new', visualName);
        process.chdir(visualPath);

        writeMetadataAsJsFile(visualPath);
    });

    afterAll(() => {
        process.chdir(startPath);
        FileSystem.deleteDirectory(tempPath);
    });

    it("Should output visual info from a JS file", () => {
        const output = FileSystem.runPbiviz('info').toString();
        const visualConfig = require(path.join(visualPath, 'pbiviz.js')).visual;
        expect(output).toContain(visualName);
        expect(output).toContain(visualConfig.guid);
    });
});


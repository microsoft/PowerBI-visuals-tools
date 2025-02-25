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

import path from "path";
import fs from 'fs-extra';

export const readdirSyncRecursive = (baseDir) => {
    const read = (dir) => {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
            file = dir + '/' + file;
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) { 
                /* Recurse into a subdirectory */
                results = results.concat(read(file));
            } else { 
                /* Is a file */
                results.push(file.replace(baseDir, ""));
            }
        });
        return results;
    };
    return read(baseDir);
};

export const writeMetadata = (visualPath) => {
    const pbivizJSONFile = path.join(visualPath, '/pbiviz.json');
    const pbiviz = fs.readJSONSync(pbivizJSONFile);
    pbiviz.visual.description = "description";
    pbiviz.visual.supportUrl = "supportUrl";
    pbiviz.author.name = "Microsoft";
    pbiviz.author.email = "pbicvsupport";
    fs.writeJSONSync(pbivizJSONFile, pbiviz);
};

export const writeMetadataAsJsFile = async (visualPath) => {
    const pbivizJSONFile = path.join(visualPath, '/pbiviz.json');
    const pbivizJSFile = path.join(visualPath, '/pbiviz.mjs');

    const pbiviz = fs.readJSONSync(pbivizJSONFile);
    pbiviz.visual.description = "description";
    pbiviz.visual.supportUrl = "supportUrl";
    pbiviz.author.name = "Microsoft";
    pbiviz.author.email = "pbicvsupport";

    const pbivizJSContents = `export const config = JSON.parse(\`${JSON.stringify(pbiviz, null, 2)}\`); export default config;`;
    fs.writeFileSync(pbivizJSFile, pbivizJSContents);
};

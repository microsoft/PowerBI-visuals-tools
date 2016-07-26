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
let less = require('less');
let config = require('../config.json');

function createProdCss(srcFilePath, cssContent) {
    let cssCommentRegExp = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
    let prodFilePath = srcFilePath.slice(0, -3) + 'prod.css';
    let cssProdContent = cssContent.replace(cssCommentRegExp, '');
    fs.writeFileSync(prodFilePath, cssProdContent);
}

class LessCompiler {
    /**
     * Builds less of a visual package
     * 
     * @param {VisualPackage} package - An instance of a visual package
     * @returns {Promise}
     */
    static build(visualPackage, options) {
        options = options || {};
        let pluginName = options.namespace || visualPackage.config.visual.guid;
        let lessFilename = visualPackage.config.style;
        return new Promise((resolve, reject) => {
            let lessPath = visualPackage.buildPath(lessFilename);
            let dropCssPath = visualPackage.buildPath(config.build.dropFolder, config.build.css);
            let lessContent = fs.readFileSync(lessPath).toString();
            lessContent = `.visual-${pluginName} { ${lessContent} }`;
            let lessMinifiedOptions = {
                sourceMap: {
                    sourceMapURL: path.basename(dropCssPath) + '.map'
                },
                compress: true
            };

            less.render(lessContent, options.minify ? lessMinifiedOptions : undefined).then(cssContent => {
                fs.ensureDirSync(path.dirname(dropCssPath));
                fs.writeFileSync(dropCssPath, cssContent.css);
                createProdCss(dropCssPath, cssContent.css);
                fs.writeFileSync(dropCssPath + '.map', cssContent.map);
                resolve();
            }).catch(e => {
                let messages = [{
                    filename: lessFilename,
                    line: e.line,
                    column: e.column,
                    message: e.message,
                    type: 'less'
                }];
                reject(messages);
            });
        });
    }
}

module.exports = LessCompiler;

"use strict";

let fs = require('fs');
let path = require('path');
let less = require('less');
let config = require('../config.json');

class LessCompiler {
    /**
     * Builds less of a visual package
     * @param {VisualPackage} package - An instance of a visual package
     * @returns {Promise}
     */
    static build(visualPackage) {
        let lessFilename = 'visual.less';
        return new Promise((resolve, reject) => {
            let lessPath = visualPackage.buildPath(lessFilename);
            let dropCssPath = visualPackage.buildPath(config.build.dropFolder, config.build.css);
            let lessContent = fs.readFileSync(lessPath).toString();
            lessContent = `.visual-${visualPackage.config.visual.guid} { ${lessContent} }`;
            less.render(lessContent, { sourceMap: {} }).then(cssContent => {
                fs.writeFileSync(dropCssPath, cssContent.css);
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
"use strict"

var fs = require('fs');
var path = require('path');
var less = require('less');

class LessCompiler {
    /**
     * Builds less of a visual package
     * @param {VisualPackage} package - An instance of a visual package
     * @returns {Promise}
     */    
    static build(visualPackage) {
        let lessFilename = 'visual.less';
        return new Promise((resolve, reject) => {
            let lessPath = path.join(visualPackage.basePath, lessFilename);
            let lessContent = fs.readFileSync(lessPath).toString();
            lessContent = `.visual-${visualPackage.config.guid} { ${lessContent} }`;
            less.render(lessContent, { sourceMap: {} }).then(cssContent => {
                fs.writeFileSync(visualPackage.dropCssPath, cssContent.css);
                fs.writeFileSync(visualPackage.dropCssPath + '.map', cssContent.map);
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
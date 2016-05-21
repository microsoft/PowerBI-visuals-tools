"use strict";

let fs = require('fs-extra');
let path = require('path');
let less = require('less');
var CleanCSS = require('clean-css');
let config = require('../config.json');

function createProdCss(srcFilePath, cssContent) {
    let cssCommentRegExp = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
    let prodFilePath = srcFilePath.slice(0,-3) + 'prod.css';
    let cssProdContent = cssContent.replace(cssCommentRegExp,'');
    fs.writeFileSync(prodFilePath, cssProdContent);    
}

class LessCompiler {
    /**
     * Builds less of a visual package
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
            less.render(lessContent, {
                sourceMap: {
                    sourceMapURL: path.basename(dropCssPath) + '.map'
                },
                compress: true
            }).then(cssContent => {
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
var fs = require('fs');
var path = require('path');
var less = require('less');

function build(package) {
    return new Promise(function (resolve, reject) {
        var lessPath = path.join(package.basePath, 'visual.less');
        var lessContent = fs.readFileSync(lessPath).toString();
        lessContent = `.visual-${package.config.guid} { ${lessContent} }`;
        less.render(lessContent, { sourceMap: {} }).then(function (cssContent) {
            fs.writeFileSync(package.dropCssPath, cssContent.css);
            fs.writeFileSync(package.dropCssPath + '.map', cssContent.map);
            resolve();
        }).catch(function (e) {
            reject(e);
        });
    });
}

module.exports = {build: build};
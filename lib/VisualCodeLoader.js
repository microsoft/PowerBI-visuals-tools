const webpack = require('webpack');
const tsLoader = require('ts-loader');

function loader(source) {
    let tsLoader_ = webpack;
    let modifiedSource = source;
    if (modifiedSource.indexOf("module powerbi.extensibility.visual") > -1) {
        modifiedSource += `\n export default powerbi;`;
    }
    return tsLoader.bind(this)(modifiedSource);
};

module.exports = loader;
module.exports.default = loader;
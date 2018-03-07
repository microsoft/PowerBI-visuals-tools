const webpack = require('webpack');
const tsLoader = require('ts-loader');

function loader(source) {

    let  tsLoader_ = webpack;
    let modifiedSource =  `${source} \n export default powerbi;`;
    console.log(tsLoader);
    return tsLoader.bind(this)(modifiedSource);
};

module.exports = loader;
module.exports.default = loader;
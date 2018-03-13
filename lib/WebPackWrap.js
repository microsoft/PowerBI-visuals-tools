"use strict";

const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const webpackConfig = require('./webpack.config');
const PowerBICustomVisualsWebpackPlugin = require('powerbi-customvisuals-webpack-plugin');
require('expose-loader');
// const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

class WebPackGenerator {

    static copyToPrecompileFolder(file) {
        let content = fs.readFileSync(file, encoding);
        content += "\n export default powerbi;"
        let fileFolder = file.replace("/",path.sep).split(path.sep);
        fileFolder.pop();
        let fileFolderString = path.join(precompileFolder, fileFolder.join('\\'));
        if (!fs.existsSync(fileFolderString)) {
            fs.mkdirSync(fileFolderString);
        }
        fs.writeFileSync(path.join(precompileFolder, file), content);
    }

    static applyWebpackConfig(visualPackage) {
        let cwd = process.cwd();
        const encoding = "utf8";
        return new Promise(function (resolve, reject) {
            const tsconfigPath = visualPackage.buildPath('tsconfig.json');
            const tsconfig = require(tsconfigPath);

            const pbivizJsonPath = visualPackage.buildPath('pbiviz.json');
            const pbiviz = require(pbivizJsonPath);

            let files = [];
            let precompileFolder = path.join(visualPackage.basePath, config.build.precompileFolder);
            if (!fs.existsSync(precompileFolder)) {
                fs.mkdirSync(precompileFolder);
            }
            for (let file in tsconfig.files) {
                if (tsconfig.files[file].indexOf(".d.ts") === -1) {
                    // let content = fs.readFileSync(tsconfig.files[file], encoding);
                    // content += "\n export default powerbi;"
                    // let fileFolder = tsconfig.files[file].replace("/",path.sep).split(path.sep);
                    // fileFolder.pop();
                    // let fileFolderString = path.join(precompileFolder, fileFolder.join('\\'));
                    // if (!fs.existsSync(fileFolderString)) {
                    //     fs.mkdirSync(fileFolderString);
                    // }
                    // fs.writeFileSync(path.join(precompileFolder, tsconfig.files[file]), content);
                    // console.log(tsconfig.files[file]);
                    // files.push(path.join(precompileFolder, tsconfig.files[file]));
                    files.push("./" +  tsconfig.files[file]); 
                    console.log(tsconfig.files[file]); 
                }
            }
            // append exteernal js to bundle
            if (pbiviz.externalJS) {
                for (let file in pbiviz.externalJS) {
                    files.push("./" +  pbiviz.externalJS[file]); 
                }
            }
            // webpackConfig.plugins.push(
            //     new TsconfigPathsPlugin({
            //         configFile: tsconfigPath
            //     })
            // );
            webpackConfig.plugins.push(
                new PowerBICustomVisualsWebpackPlugin({
                    ...visualPackage.config,
                    devMode: true
                })
            );

            
            webpackConfig.output.path = path.join(visualPackage.basePath, config.build.dropFolder);
            webpackConfig.devServer.contentBase = path.join(visualPackage.basePath, config.build.dropFolder);
            webpackConfig.devServer.https = {
                key: config.server.privateKey,
                cert: config.server.certificate,
                pfx: config.server.pfx
            };
            webpackConfig.module.rules.pop();
            webpackConfig.module.rules.push( 
                {
                    test: /\.tsx?$/,
                    loader: require.resolve('./VisualCodeLoader.js'),
                    exclude: /node_modules/
                }
            )
            // webpackConfig.module.rules.push({
            //     // test: require.resolve('./src/internal.ts'),
            //     use: [{
            //         loader: 'expose-loader',
            //         options: 'CustomVisual'
            //     }]
            // });
            let entryIndex = 0;
            webpackConfig.entry = files;

            resolve(webpackConfig);
        });
    }
}


module.exports = WebPackGenerator;
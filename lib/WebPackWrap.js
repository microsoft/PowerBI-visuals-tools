"use strict";

const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const webpackConfig = require('./webpack.config');
const PowerBICustomVisualsWebpackPlugin = require('powerbi-customvisuals-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

class WebPackGenerator {
    static applyWebpackConfig(visualPackage) {
        let cwd = process.cwd();
        return new Promise(function (resolve, reject) {
            const tsconfigPath = visualPackage.buildPath('tsconfig.json');
            const tsconfig = require(tsconfigPath);
            let files = [];
            for (let file in tsconfig.files) {
                if (tsconfig.files[file].indexOf(".d.ts") === -1) {
                    files.push("./" +  tsconfig.files[file]);
                    console.log(tsconfig.files[file]);
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
            let entryIndex = 0;
            webpackConfig.entry = files;
            console.log(webpackConfig);

            resolve(webpackConfig);
        });
    }
}


module.exports = WebPackGenerator;
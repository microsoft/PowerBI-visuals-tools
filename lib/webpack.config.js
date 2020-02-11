const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const config = require("../config.json");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: {
        'visual.js': ['./src/visual.ts']
    },
    devtool: 'source-map',
    mode: "production",
    optimization: {
        minimizer: [
            new TerserPlugin({
                cache: true,
                parallel: true,
                sourceMap: true,
                terserOptions: {}
            })
        ],
        minimize: false,
        concatenateModules: false
    },
    performance: {
        maxEntrypointSize: 1024000,
        maxAssetSize: 1024000,
        hints: false
    },
    module: {
        rules: [
            {
                parser: {
                    amd: false
                }
            },
            {
                test: /\.json$/,
                loader: require.resolve('json-loader'),
                type: "javascript/auto"
            },
            {
                test: /(\.less)|(\.css)$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: require.resolve('css-loader')
                    },
                    {
                        loader: require.resolve('less-loader'),
                        options: {
                            paths: [path.resolve(__dirname, "..", 'node_modules')]
                        }
                    }
                ]
            },
            {
                test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|webp|gif|svg|eot)$/i,
                use: [
                    {
                        loader: require.resolve('base64-inline-loader')
                    }
                ]
            }
        ]
    },
    externals: {
        "powerbi-visuals-api": 'null',
        "fakeDefine": 'false',
        "corePowerbiObject": "Function('return this.powerbi')()",
        "realWindow": "Function('return this')()"
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.css']
    },
    output: {
        path: null,
        publicPath: 'assets',
        filename: "[name]"
    },
    devServer: {
        disableHostCheck: true,
        contentBase: null,
        compress: true,
        port: 8080,
        hot: false,
        inline: false,
        https: true,
        headers: {
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=0"
        }
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: config.build.css,
            chunkFilename: "[id].css"
        })
    ]
};


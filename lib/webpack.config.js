const path = require("path");

module.exports = {
    entry: {
        'visual.js': ['./src/visual.ts']
    },
    devtool: 'source-map',
    mode: "development",
    module: {
        rules: [
            {
                parser: {
                    amd: false
                }
            },
            {
                test: /\.tsx?$/,
                use: require.resolve('ts-loader'),
                exclude: /node_modules/
            },
            {
                test: /\.json$/,
                loader: require.resolve('json-loader'),
                type: "javascript/auto"
            },
            {
                test: /\.less$/,
                use: [
                    {
                        loader: require.resolve('style-loader')
                    },
                    {
                        loader: require.resolve('css-loader')
                    },
                    {
                        loader: require.resolve('less-loader'),
                        options: {
                            paths: [path.resolve(__dirname, 'node_modules')]
                        }
                    }
                ]
            }
        ]
    },
    externals: {
        "powerbi-visuals-api": 'null',
        "fakeDefine": 'false'
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.css']
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
        https: {},
        headers: {
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=0"
        }
    },
    plugins: []
};

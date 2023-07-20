
import { getRootPath, readJsonFromRoot } from './utils.js';
import { LocalizationLoader } from "powerbi-visuals-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import path from "path";
import webpack from "webpack";

const config = readJsonFromRoot("/config.json");

const webpackConfig = {
    entry: {
        'visual.js': ['./src/visual.ts']
    },
    target: 'web',
    devtool: false,
    mode: "production",
    optimization: {
        minimizer: [
            new TerserPlugin({
                parallel: true,
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
                loader: 'json-loader',
                type: "javascript/auto"
            },
            {
                test: /(\.less)|(\.css)$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            lessOptions: {
                                paths: [path.resolve(getRootPath(), 'node_modules')]
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|webp|gif|svg|eot)$/i,
                type: 'asset/inline'
            },
            { 
                test: /powerbiGlobalizeLocales\.js$/,
                loader: LocalizationLoader
            }
        ]
    },
    externals: {
        "powerbi-visuals-api": 'null'
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.css'],
        fallback: {
            assert: path.resolve("../node-modules/assert/"),
            buffer: path.resolve("../node-modules/buffer/"),
            console: path.resolve("../node-modules/console-browserify/"),
            constants: path.resolve("../node-modules/constants-browserify/"),
            crypto: path.resolve("../node-modules/crypto-browserify/"),
            domain: path.resolve("../node-modules/domain-browser/"),
            events: path.resolve("../node-modules/events/"),
            http: path.resolve("../node-modules/stream-http/"),
            https: path.resolve("../node-modules/https-browserify/"),
            os: path.resolve("../node-modules/os-browserify/"),
            path: path.resolve("../node-modules/path-browserify/"),
            punycode: path.resolve("../node-modules/punycode/"),
            process: path.resolve("../node-modules/process/"),
            querystring: path.resolve("../node-modules/querystring-es3/"),
            stream: path.resolve("../node-modules/stream-browserify/"),
            _stream_duplex: path.resolve("../node-modules/readable-stream/"),
            _stream_passthrough: path.resolve("../node-modules/readable-stream/"),
            _stream_readable: path.resolve("../node-modules/readable-stream/"),
            _stream_transform: path.resolve("../node-modules/readable-stream/"),
            _stream_writable: path.resolve("../node-modules/readable-stream/"),
            string_decoder: path.resolve("../node-modules/string_decoder/"),
            sys: path.resolve("../node-modules/util/"),
            timers: path.resolve("../node-modules/timers-browserify/"),
            tty: path.resolve("../node-modules/tty-browserify/"),
            url: path.resolve("../node-modules/url/"),
            util: path.resolve("../node-modules/util/"),
            vm: path.resolve("../node-modules/vm-browserify/"),
            zlib: path.resolve("../node-modules/browserify-zlib/")
        }
    },
    output: {
        path: null,
        publicPath: 'assets',
        filename: "[name]"
    },
    devServer: {
        allowedHosts: "all",
        static: {
            directory: null
        },
        compress: true,
        port: 8080,
        hot: false,
        server: 'https',
        headers: {
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=0"
        }
    },
    watchOptions: {
        ignored: ['node_modules/**']
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ["buffer", "Buffer"],
            process: "process/browser"
        }),
        new MiniCssExtractPlugin({
            filename: config.build.css,
            chunkFilename: "[id].css"
        })
    ]
};

export default webpackConfig;

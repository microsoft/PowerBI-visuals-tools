
import { getRootPath, readJsonFromRoot } from './utils.js';
import { LocalizationLoader } from "powerbi-visuals-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import path from "path";
import webpack from "webpack";

const config = readJsonFromRoot("/config.json");
const rootPath = getRootPath();

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
                loader: path.resolve(rootPath, "node_modules", "json-loader"),
                type: "javascript/auto"
            },
            {
                test: /(\.less)|(\.css)$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: path.resolve(rootPath, "node_modules", "css-loader")
                    },
                    {
                        loader: path.resolve(rootPath, "node_modules", "less-loader"),
                        options: {
                            lessOptions: {
                                paths: [path.resolve(rootPath, 'node_modules')]
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
            assert: path.resolve(rootPath, "node_modules", "assert"),
            buffer: path.resolve(rootPath, "node_modules", "buffer"),
            console: path.resolve(rootPath, "node_modules", "console-browserify"),
            constants: path.resolve(rootPath, "node_modules", "constants-browserify"),
            crypto: path.resolve(rootPath, "node_modules", "crypto-browserify"),
            domain: path.resolve(rootPath, "node_modules", "domain-browser"),
            events: path.resolve(rootPath, "node_modules", "events"),
            http: path.resolve(rootPath, "node_modules", "stream-http"),
            https: path.resolve(rootPath, "node_modules", "https-browserify"),
            os: path.resolve(rootPath, "node_modules", "os-browserify"),
            path: path.resolve(rootPath, "node_modules", "path-browserify"),
            punycode: path.resolve(rootPath, "node_modules", "punycode"),
            process: path.resolve(rootPath, "node_modules", "process"),
            querystring: path.resolve(rootPath, "node_modules", "querystring-es3"),
            stream: path.resolve(rootPath, "node_modules", "stream-browserify"),
            _stream_duplex: path.resolve(rootPath, "node_modules", "readable-stream"),
            _stream_passthrough: path.resolve(rootPath, "node_modules", "readable-stream"),
            _stream_readable: path.resolve(rootPath, "node_modules", "readable-stream"),
            _stream_transform: path.resolve(rootPath, "node_modules", "readable-stream"),
            _stream_writable: path.resolve(rootPath, "node_modules", "readable-stream"),
            string_decoder: path.resolve(rootPath, "node_modules", "string_decoder"),
            sys: path.resolve(rootPath, "node_modules", "util"),
            timers: path.resolve(rootPath, "node_modules", "timers-browserify"),
            tty: path.resolve(rootPath, "node_modules", "tty-browserify"),
            url: path.resolve(rootPath, "node_modules", "url"),
            util: path.resolve(rootPath, "node_modules", "util"),
            vm: path.resolve(rootPath, "node_modules", "vm-browserify"),
            zlib: path.resolve(rootPath, "node_modules", "browserify-zlib")
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
        ignored: ['node_modules", "**']
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

import { getRootPath, readJsonFromRoot } from './utils.js';
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import path from "path";
import webpack from "webpack";

const config = await readJsonFromRoot("/config.json");
const rootPath = getRootPath();

const webpackConfig = {
    entry: {
        'visual.js': ['./src/visual.ts']
    },
    target: 'web',
    node: false,
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
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.json$/,
                loader: "json-loader",
                type: "javascript/auto"
            },
            {
                test: /(\.less)|(\.css)$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: "css-loader"
                    },
                    {
                        loader: "less-loader",
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
            }
        ]
    },
    resolveLoader: {
        modules: ['node_modules', path.resolve(rootPath, 'node_modules')],
    },
    externals: {
        "powerbi-visuals-api": 'null',
        // Prevent Node.js core modules from being bundled
        "fs": "{}",
        "path": "{}",
        "os": "{}",
        "crypto": "{}",
        "http": "{}",
        "https": "{}",
        "url": "{}",
        "util": "{}",
        "stream": "{}",
        "buffer": "{}",
        "process": "{}",
        "events": "{}",
        "child_process": "{}",
        "cluster": "{}",
        "dgram": "{}",
        "dns": "{}",
        "net": "{}",
        "readline": "{}",
        "repl": "{}",
        "tls": "{}",
        "tty": "{}",
        "zlib": "{}",
        "constants": "{}",
        "vm": "{}",
        "assert": "{}"
    },
    resolve: {
        symlinks: false,
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.css'],
        modules: ['node_modules', path.resolve(rootPath, 'node_modules')],
        fallback: {
            assert: false,
            buffer: false,
            console: false,
            constants: false,
            crypto: false,
            domain: false,
            events: false,
            http: false,
            https: false,
            os: false,
            path: false,
            punycode: false,
            process: false,
            querystring: false,
            stream: false,
            _stream_duplex: false,
            _stream_passthrough: false,
            _stream_readable: false,
            _stream_transform: false,
            _stream_writable: false,
            string_decoder: false,
            sys: false,
            timers: false,
            tty: false,
            url: false,
            util: false,
            vm: false,
            zlib: false
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
        new MiniCssExtractPlugin({
            filename: config.build.css,
            chunkFilename: "[id].css"
        })
    ]
};

export default webpackConfig;

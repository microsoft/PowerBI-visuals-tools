
import { getRootPath, readJsonFromRoot } from './utils.js';
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
        "powerbi-visuals-api": 'null'
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.css'],
        modules: ['node_modules', path.resolve(rootPath, 'node_modules')],
        fallback: {
            assert: "assert",
            buffer: "buffer",
            console: "console-browserify",
            constants: "constants-browserify",
            crypto: "crypto-browserify",
            domain: "domain-browser",
            events: "events",
            http: "stream-http",
            https: "https-browserify",
            os: "os-browserify",
            path: "path-browserify",
            punycode: "punycode",
            process: "process",
            querystring: "querystring-es3",
            stream: "stream-browserify",
            _stream_duplex: "readable-stream",
            _stream_passthrough: "readable-stream",
            _stream_readable: "readable-stream",
            _stream_transform: "readable-stream",
            _stream_writable: "readable-stream",
            string_decoder: "string_decoder",
            sys: "util",
            timers: "timers-browserify",
            tty: "tty-browserify",
            url: "url",
            util: "util",
            vm: "vm-browserify",
            zlib: "browserify-zlib"
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

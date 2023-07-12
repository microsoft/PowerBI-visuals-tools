
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
            assert: require.resolve("assert/"),
            buffer: require.resolve("buffer/"),
            console: require.resolve("console-browserify/"),
            constants: require.resolve("constants-browserify/"),
            crypto: require.resolve("crypto-browserify/"),
            domain: require.resolve("domain-browser/"),
            events: require.resolve("events/"),
            http: require.resolve("stream-http/"),
            https: require.resolve("https-browserify/"),
            os: require.resolve("os-browserify/"),
            path: require.resolve("path-browserify/"),
            punycode: require.resolve("punycode/"),
            process: require.resolve("process/"),
            querystring: require.resolve("querystring-es3/"),
            stream: require.resolve("stream-browserify/"),
            /* eslint-disable camelcase */
            _stream_duplex: require.resolve("readable-stream/"),
            _stream_passthrough: require.resolve("readable-stream/"),
            _stream_readable: require.resolve("readable-stream/"),
            _stream_transform: require.resolve("readable-stream/"),
            _stream_writable: require.resolve("readable-stream/"),
            string_decoder: require.resolve("string_decoder/"),
            /* eslint-enable camelcase */
            sys: require.resolve("util/"),
            timers: require.resolve("timers-browserify/"),
            tty: require.resolve("tty-browserify/"),
            url: require.resolve("url/"),
            util: require.resolve("util/"),
            vm: require.resolve("vm-browserify/"),
            zlib: require.resolve("browserify-zlib/")
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

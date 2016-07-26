/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

let fs = require('fs');
let path = require('path');
let https = require('https');
let connect = require('connect');
let serveStatic = require('serve-static');
let config = require('../config.json');

class VisualServer {
    /**
     * Creates an instance of a server for serving custom visuals
     * 
     * @param {VisualPackage} package - A visual package to be served
     * @param {number} [port] - Port the server will listen on 
     */
    constructor(visualPackage, port) {
        this.visualPackage = visualPackage;
        this.port = port || config.server.port;
    }

    /**
     * Starts the server
     * 
     * @returns {Promise}
     */
    start() {
        return new Promise((resolve, reject) => {
            try {
                let options = {
                    key: fs.readFileSync(path.join(__dirname, '..', config.server.privateKey)),
                    cert: fs.readFileSync(path.join(__dirname, '..', config.server.certificate))
                };
                let dropPath = this.visualPackage.buildPath(config.build.dropFolder);
                let precompilePath = this.visualPackage.buildPath(config.build.precompileFolder);

                let app = connect();
                let webRootPath = path.join(__dirname, '..', config.server.root);
                app.use((req, res, next) => {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    next();
                });
                app.use(serveStatic(webRootPath));
                app.use(config.server.assetsRoute, serveStatic(dropPath));
                app.use('/' + path.basename(precompilePath), serveStatic(precompilePath));

                this.server = https.createServer(options, app).listen(this.port, () => {
                    resolve();
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Stops the server
     */
    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}

module.exports = VisualServer;

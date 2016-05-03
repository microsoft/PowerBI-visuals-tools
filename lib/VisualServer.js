"use strict";

let fs = require('fs');
let path = require('path');
let https = require('https');
let connect = require('connect');
let serveStatic = require('serve-static');

//route that maps to the visual drop path (must start with a "/")
let ASSET_ROUTE = "/assets";
//absolute path to the local visual test root
let WEB_ROOT_PATH = path.resolve(__dirname + '/../webRoot');

class VisualServer {
    /**
     * Creates an instance of a server for serving custom visuals
     * @param {VisualPackage} package - A visual package to be served
     * @param {number} [port=8080] - Port the server will listen on 
     */
    constructor(visualPackage, port) {
        this.package = visualPackage;
        this.port = port || 8080;
    }

    /**
     * Starts the server
     * @returns {Promise}
     */
    start() {
        return new Promise((resolve, reject) => {
            try {
                let options = {
                    key: fs.readFileSync(path.resolve(__dirname + '/../certs/privatekey.key')),
                    cert: fs.readFileSync(path.resolve(__dirname + '/../certs/certificate.crt'))
                };
                let app = connect();
                app.use(serveStatic(WEB_ROOT_PATH));
                app.use(ASSET_ROUTE, serveStatic(this.package.dropPath));
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
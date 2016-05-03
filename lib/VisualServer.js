"use strict";

let fs = require('fs');
let path = require('path');
let https = require('https');
let connect = require('connect');
let serveStatic = require('serve-static');
let config = require('../config.json');

//route that maps to the visual drop path (must start with a "/")
const ASSET_ROUTE = config.server.assetsRoute;
//absolute path to the local visual test root
const WEB_ROOT_PATH = path.join(__dirname, '..', config.server.root);

class VisualServer {
    /**
     * Creates an instance of a server for serving custom visuals
     * @param {VisualPackage} package - A visual package to be served
     * @param {number} [port=8080] - Port the server will listen on 
     */
    constructor(visualPackage, port) {
        this.visualPackage = visualPackage;
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
                    key: fs.readFileSync(path.join(__dirname, '..', config.server.privateKey)),
                    cert: fs.readFileSync(path.join(__dirname, '..', config.server.certificate))
                };
                let dropPath = this.visualPackage.buildPath(config.build.dropFolder);
                
                let app = connect();
                app.use(serveStatic(WEB_ROOT_PATH));
                app.use(ASSET_ROUTE, serveStatic(dropPath));
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
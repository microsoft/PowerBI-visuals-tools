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
     * @param {VisualPackage} package - A visual package to be served
     * @param {number} [port] - Port the server will listen on 
     */
    constructor(visualPackage, port) {
        this.visualPackage = visualPackage;
        this.port = port || config.server.port;
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
                let webRootPath = path.join(__dirname, '..', config.server.root);
                app.use((req, res, next) => {
                    res.setHeader('Access-Control-Allow-Origin','*');
                    next();                     
                });
                app.use(serveStatic(webRootPath));
                app.use(config.server.assetsRoute, serveStatic(dropPath));
                
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

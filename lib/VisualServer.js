var fs = require('fs');
var path = require('path');
var https = require('https');
var connect = require('connect');
var serveStatic = require('serve-static');

//route that maps to the visual drop path (must start with a "/")
var ASSET_ROUTE = "/assets";
//absolute path to the local visual test root
var WEB_ROOT_PATH = path.resolve(__dirname + '/../webRoot');

/**
 * Creates an instance of a server for serving custom visuals
 * @param {VisualPackage} package - A visual package to be served
 * @param {number} [port=8080] - Port the server will listen on 
 */
function VisualServer(package, port) {
    this.package = package;
    this.port = port || 8080;
}

/**
 * Starts the server
 * @param {Function} callback - called when the server starts listening
 */
VisualServer.prototype.start = function () {
    return new Promise((resolve, reject) => {
        try {
            var options = {
                key: fs.readFileSync(path.resolve(__dirname + '/../certs/privatekey.key')),
                cert: fs.readFileSync(path.resolve(__dirname + '/../certs/certificate.crt'))
            };
            var app = connect();
            app.use(serveStatic(WEB_ROOT_PATH));
            app.use(ASSET_ROUTE, serveStatic(this.package.dropPath));
            this.server = https.createServer(options, app).listen(this.port, function(){
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
};

/**
 * Stops the server
 */
VisualServer.prototype.stop = function () {
    if(this.server) {
        this.server.close();
        this.server = null;
    }
};

module.exports = VisualServer;
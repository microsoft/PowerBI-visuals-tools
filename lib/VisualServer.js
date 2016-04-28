var fs = require('fs');
var path = require('path');
var https = require('https');
var connect = require('connect');
var serveStatic = require('serve-static');

/**
 * Creates an instance of a server for serving custom visuals
 * @param {string} visualAssetPath - Path to the visual files
 * @param {number} [port=8080] - Port the server will listen on 
 */
function VisualServer(visualAssetPath, port) {
    this.assetPath = visualAssetPath;
    this.port = port || 8080;
}

/**
 * Starts the server
 * @param {Function} callback - called when the server starts listening
 */
VisualServer.prototype.start = function(callback) {
    var options = {
        key: fs.readFileSync(path.resolve(__dirname + '/../certs/privatekey.key')),
        cert: fs.readFileSync(path.resolve(__dirname + '/../certs/certificate.crt'))
    };
    var app = connect();
    app.use(serveStatic(path.resolve(__dirname + '/../webRoot')));
    app.use('/assets',serveStatic(this.assetPath));
    this.server = https.createServer(options, app).listen(this.port, callback);
};

/**
 * Stops the server
 */
VisualServer.prototype.stop = function() {
    this.server.close();
    this.server = null;
}


module.exports = VisualServer;
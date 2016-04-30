var program = require('commander');
var VisualPackage = require('../lib/VisualPackage');
var VisualServer = require('../lib/VisualServer');
var VisualBuilder = require('../lib/VisualBuilder');

program
    .option('-p, --port [port]', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;
var cwd = process.cwd();
var server, builder;

VisualPackage.loadVisualPackage(cwd).then(function (package) {
    
    console.info('Building visual...');
    builder = new VisualBuilder(package);
    builder.build(true).then(function () {
        builder.startWatcher();
        builder.on('watch_change', function(event) {
            console.info('CHANGE DETECTED (' + event + ')');
        });
        builder.on('watch_complete', function(event) {
            console.info('BUILD COMPLETE (' + event + ')');
        });
        builder.on('watch_error', function(event) {
            console.error('BUILD ERROR', event);
        });
        console.info('Starting server...');
        server = new VisualServer(package, program.port);
        server.start().then(function () {
            console.info('Server listening on port ' + server.port + '.');
        }).catch(function(e) {
            console.error('SERVER ERROR', e);
        });
    }).catch(function (e) {
        console.error('BUILD ERROR', e);
    });
}).catch(function(e){
    console.error('LOAD ERROR', e);
});

//clean up
function stopServer() {
    console.info("Stopping server...");
    if(server) {
        server.stop();
        server = null;
    }
    if(builder) {
        builder.startWatcher();
        builder = null;
    }
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);
var program = require('commander');
var VisualPackage = require('../lib/VisualPackage');
var VisualServer = require('../lib/VisualServer');
var VisualBuilder = require('../lib/VisualBuilder');
var ConsoleWriter = require('../lib/ConsoleWriter');

program
    .option('-p, --port [port]', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;
var cwd = process.cwd();
var server, builder;

VisualPackage.loadVisualPackage(cwd).then(function (package) {
    
    ConsoleWriter.info('Building visual...');
    builder = new VisualBuilder(package);
    builder.build(true).then(function () {
        ConsoleWriter.done('build complete');
        
        builder.startWatcher();
        builder.on('watch_change', function(changeType) {
            ConsoleWriter.blank();
            ConsoleWriter.info(changeType + ' change detected. Rebuilding...');
        });
        builder.on('watch_complete', function(changeType) {
            ConsoleWriter.info(changeType + ' build complete');
        });
        builder.on('watch_error', function(errors) {
            ConsoleWriter.formattedErrors(errors);
        });
        
        ConsoleWriter.blank();
        ConsoleWriter.info('Starting server...');
        server = new VisualServer(package, program.port);
        server.start().then(function () {
            ConsoleWriter.info('Server listening on port ' + server.port + '.');
        }).catch(function(e) {
            ConsoleWriter.error('SERVER ERROR', e);
        });
    }).catch(function (e) {
        ConsoleWriter.formattedErrors(e);
    });
}).catch(function(e){
    ConsoleWriter.error('LOAD ERROR', e);
});

//clean up
function stopServer() {
    ConsoleWriter.info("Stopping server...");
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
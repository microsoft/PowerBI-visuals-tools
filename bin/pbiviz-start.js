"use strict";

let program = require('commander');
let VisualPackage = require('../lib/VisualPackage');
let VisualServer = require('../lib/VisualServer');
let VisualBuilder = require('../lib/VisualBuilder');
let ConsoleWriter = require('../lib/ConsoleWriter');

program
    .option('-p, --port [port]', 'force creation (overwrites folder if exists)')
    .option('-m, --mute', 'mute error sounds')
    .parse(process.argv);

let args = program.args;
let cwd = process.cwd();
let server, builder;

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {

    ConsoleWriter.info('Building visual...');
    builder = new VisualBuilder(visualPackage, 'CustomVisual');
    builder.build().then(() => {
        ConsoleWriter.done('build complete');

        builder.startWatcher();
        builder.on('watch_change', changeType => {
            ConsoleWriter.blank();
            ConsoleWriter.info(changeType + ' change detected. Rebuilding...');
        });
        builder.on('watch_complete', changeType => {
            ConsoleWriter.done(changeType + ' build complete');
        });
        builder.on('watch_error', errors => {
            if (!program.mute) ConsoleWriter.beep();
            ConsoleWriter.formattedErrors(errors);
        });

        ConsoleWriter.blank();
        ConsoleWriter.info('Starting server...');
        server = new VisualServer(visualPackage, program.port);
        server.start().then(() => {
            ConsoleWriter.info('Server listening on port ' + server.port + '.');
        }).catch(e => {
            ConsoleWriter.error('SERVER ERROR', e);
        });
    }).catch(e => {
        if (!program.mute) ConsoleWriter.beep();
        ConsoleWriter.formattedErrors(e);
    });
}).catch(e => {
    ConsoleWriter.error('LOAD ERROR', e);
});

//clean up
function stopServer() {
    ConsoleWriter.info("Stopping server...");
    if (server) {
        server.stop();
        server = null;
    }
    if (builder) {
        builder.startWatcher();
        builder = null;
    }
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);
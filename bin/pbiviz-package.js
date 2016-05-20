"use strict";

let program = require('commander');
let VisualPackage = require('../lib/VisualPackage');
let ConsoleWriter = require('../lib/ConsoleWriter');
let PbivizBuilder = require('../lib/PbivizBuilder');
let VisualBuilder = require('../lib/VisualBuilder');

program
.option('--debug', "debug")
.parse(process.argv);

let args = program.args;
let cwd = process.cwd();

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {

    ConsoleWriter.info('Building visual...');

    let builder = new VisualBuilder(visualPackage);
    builder.build().then(() => {
        ConsoleWriter.done('build complete');
        ConsoleWriter.blank();
        ConsoleWriter.info('Building visual...');
        let packager = new PbivizBuilder(visualPackage);
        packager.build().then(() => {
            ConsoleWriter.done('packaging complete');
        }).catch(e => {
            ConsoleWriter.error('PACKAGE ERROR', e);
        });
    }).catch(e => {
        ConsoleWriter.formattedErrors(e);
    });
}).catch(e => {
    ConsoleWriter.error('LOAD ERROR', e);
    
});
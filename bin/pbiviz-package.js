"use strict";

let program = require('commander');
let VisualPackage = require('../lib/VisualPackage');
let ConsoleWriter = require('../lib/ConsoleWriter');

program.parse(process.argv);

let args = program.args;
let cwd = process.cwd();

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
    ConsoleWriter.info('pbiviz package... coming soon.');
}).catch((e) => {
    ConsoleWriter.error('LOAD ERROR', e);
});
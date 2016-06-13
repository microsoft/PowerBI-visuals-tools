"use strict";

let program = require('commander');
let VisualPackage = require('../lib/VisualPackage');
let ConsoleWriter = require('../lib/ConsoleWriter');
let fs = require('fs');

program.parse(process.argv);

let cwd = process.cwd();

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
    let info = visualPackage.config;
    if (info) {
        ConsoleWriter.infoTable(info);
    } else {
        ConsoleWriter.error('Unable to load visual info. Please ensure the package is valid.');
    }
}).catch((e) => {
    ConsoleWriter.error('LOAD ERROR', e);
    process.exit(1);
});

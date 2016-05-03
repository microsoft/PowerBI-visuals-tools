"use strict";

let path = require('path');
let program = require('commander');
let VisualPackage = require('../lib/VisualPackage');
let ConsoleWriter = require('../lib/ConsoleWriter');

program
    .option('-f, --force', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

let args = program.args;

if (args.length != 1 || !args[0]) {
    ConsoleWriter.error("You must enter a 1 word visual name");
    process.exit(1);
}

let name = args[0];
let cwd = process.cwd();
let target = path.join(cwd, name);

ConsoleWriter.info('Creating new visual');

if (program.force) {
    ConsoleWriter.warn('Running with force flag. Existing files will be overwritten');
}

VisualPackage.createVisualPackage(target, program.force).then(() => {
    ConsoleWriter.done('Visual creation complete');
}).catch((e) => {
    ConsoleWriter.error('Unable to create visual.', e);
});
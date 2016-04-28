var child_process = require('child_process');
var path = require('path');
var fs = require('fs-extra');
var program = require('commander');
var VisualPackage = require('../lib/VisualPackage');

program
    .option('-f, --force', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;

if(args.length != 1 || !args[0]) {
    console.error("You must enter a 1 word visual name");
    process.exit(1);
}

var name = args[0];
var cwd = process.cwd();
var target = path.join(cwd, name);

var package = new VisualPackage(target);

try {
    package.create(program.force);
    console.log('Visual creation finished.');
} catch (e) {
    console.error('Unable to create visual.', e);
}
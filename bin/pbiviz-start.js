var path = require('path');
var fs = require('fs-extra');
var program = require('commander');
var VisualPackage = require('./lib/VisualPackage');

program
    //.option('-f, --force', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;
var cwd = process.cwd();

var package = new VisualPackage(cwd);

if(!package.valid()) {
    console.error('You must be in the root of a visual project to run this command.');
    process.exit(1);
}


console.log('pbiviz start... coming soon.', package.getConfig());
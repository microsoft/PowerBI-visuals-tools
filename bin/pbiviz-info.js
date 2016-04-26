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

var info;

try {
    info = package.getConfig();
} catch (e) { }

if(info) {
    for(var key in info) {
        console.log(key + ":", info[key]);
    }
} else {
    console.error('Unable to load visual info. Please ensure the pbiviz.json is valid.');
}
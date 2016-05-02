var path = require('path');
var program = require('commander');
var VisualPackage = require('../lib/VisualPackage');
var ConsoleWriter = require('../lib/ConsoleWriter');

program
    .option('-f, --force', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;

if (args.length != 1 || !args[0]) {
    ConsoleWriter.error("You must enter a 1 word visual name");
    process.exit(1);
}

var name = args[0];
var cwd = process.cwd();
var target = path.join(cwd, name);

ConsoleWriter.info('Creating new visual');

if(program.force) {
    ConsoleWriter.warn('Running with force flag. Existing files will be overwritten');
}

VisualPackage.createVisualPackage(target, program.force).then(function () {
    ConsoleWriter.done('Visual creation complete');
}).catch(function (e) {
    ConsoleWriter.error('Unable to create visual.', e);
});
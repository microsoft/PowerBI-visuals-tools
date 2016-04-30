var path = require('path');
var program = require('commander');
var VisualPackage = require('../lib/VisualPackage');

program
    .option('-f, --force', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;

if (args.length != 1 || !args[0]) {
    console.error("You must enter a 1 word visual name");
    process.exit(1);
}

var name = args[0];
var cwd = process.cwd();
var target = path.join(cwd, name);

VisualPackage.createVisualPackage(target, program.force).then(function () {
    console.log('Visual creation finished.');
}).catch(function (e) {
    console.error('Unable to create visual.', e);
});
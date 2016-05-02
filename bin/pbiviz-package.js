var program = require('commander');
var VisualPackage = require('../lib/VisualPackage');
var ConsoleWriter = require('../lib/ConsoleWriter');

program
    //.option('-f, --force', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;
var cwd = process.cwd();

VisualPackage.loadVisualPackage(cwd).then(function (package) {
    ConsoleWriter.info('pbiviz package... coming soon.');
}).catch(function (e) {
    ConsoleWriter.error('LOAD ERROR', e);
});
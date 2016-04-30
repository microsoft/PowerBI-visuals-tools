var program = require('commander');
var VisualPackage = require('../lib/VisualPackage');

program
    //.option('-f, --force', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;
var cwd = process.cwd();

VisualPackage.loadVisualPackage(cwd).then(function (package) {
    console.log('pbiviz package... coming soon.');
}).catch(function (e) {
    console.error('LOAD ERROR', e);
});
var program = require('commander');
var VisualPackage = require('../lib/VisualPackage');

program
    //.option('-f, --force', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;
var cwd = process.cwd();

VisualPackage.loadVisualPackage(cwd).then(function (package) {
    var info = package.config;
    if (info) {
        for (var key in info) {
            console.log(key + ":", info[key]);
        }
    } else {
        console.error('Unable to load visual info. Please ensure the package is valid.');
    }
}).catch(function (e) {
    console.error('LOAD ERROR', e);
});

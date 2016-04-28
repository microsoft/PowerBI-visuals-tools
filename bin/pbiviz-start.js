var path = require('path');
var fs = require('fs-extra');
var program = require('commander');
var VisualPackage = require('../lib/VisualPackage');
var VisualServer = require('../lib/VisualServer');
var VisualBuilder = require('../lib/VisualBuilder');

program
    .option('-p, --port [port]', 'force creation (overwrites folder if exists)')
    .parse(process.argv);

var args = program.args;
var cwd = process.cwd();

var package = new VisualPackage(cwd);

if(!package.valid()) {
    console.error('You must be in the root of a visual project to run this command.');
    process.exit(1);
}


// console.log('pbiviz start... coming soon.', package.getConfig());

console.log('building visual');
new VisualBuilder().build().then(function(){
    var assetPath = path.join(cwd, '.bin');

    if(!fs.existsSync(assetPath)) {
        fs.mkdirSync(assetPath);
        fs.writeFileSync(path.join(assetPath, 'visual.js'), "console.log('visual loaded');");
        fs.writeFileSync(path.join(assetPath, 'visual.css'), "body { background: blue; }");
    }

    console.log('starting server')

    var server = new VisualServer(assetPath, program.port);
    server.start(function(){
        console.log('Server listening on port ' + server.port + '.');
    });
});
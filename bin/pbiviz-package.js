"use strict";

let program = require('commander');
let VisualPackage = require('../lib/VisualPackage');
let ConsoleWriter = require('../lib/ConsoleWriter');
let PbivizBuilder = require('../lib/PbivizBuilder');
let VisualBuilder = require('../lib/VisualBuilder');

program
.option('--resources', "Produces a folder containing the pbiviz resource files (js, css, json)")
.option('--no-pbiviz', "Doesn't produce a pbiviz file (must be used in conjunction with resources flag)")
.parse(process.argv);

let cwd = process.cwd();

if(!program.pbiviz && !program.resources) {
    ConsoleWriter.error('Nothing to build. Cannot use --no-pbiviz without --resources');
    process.exit(1);
}

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
    ConsoleWriter.info('Building visual...');

    let builder = new VisualBuilder(visualPackage);
    builder.build().then(() => {
        ConsoleWriter.done('build complete');
        ConsoleWriter.blank();
        ConsoleWriter.info('Building visual...');
        let packager = new PbivizBuilder(visualPackage, {
            resources: program.resources,
            pbiviz: program.pbiviz
        });
        packager.build().then(() => {
            ConsoleWriter.done('packaging complete');
        }).catch(e => {
            ConsoleWriter.error('PACKAGE ERROR', e);
            process.exit(1);
        });
    }).catch(e => {
        ConsoleWriter.formattedErrors(e);
        process.exit(1);
    });
}).catch(e => {
    ConsoleWriter.error('LOAD ERROR', e);
    process.exit(1);
});
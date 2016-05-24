#!/usr/bin/env node
"use strict";

let program = require('commander');
let npmPackage = require('../package.json');
let ConsoleWriter = require('../lib/ConsoleWriter');
let args = process.argv;

program
    .version(npmPackage.version)
    .command('new [name]', 'Create a new visual')
    .command('info', 'Display info about the current visual')
    .command('start', 'Start the current visual')
    .command('package', 'Package the current visual into a pbiviz file');

//prepend logo to help screen
if (args.length === 2 || (args.length > 2 && args[2] === 'help')) {
    ConsoleWriter.logo();
}

program.parse(args);

if(program.args.length > 0) {
    let validCommands = program.commands.map(c => c.name())
    if(validCommands.indexOf(program.args[0]) === -1) {   
        ConsoleWriter.error("Invalid command. Run 'pbiviz help' for usage instructions.");
        process.exit(1);
    }
}
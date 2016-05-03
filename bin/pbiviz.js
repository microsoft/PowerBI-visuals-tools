#!/usr/bin/env node
var program = require('commander');
var package = require('../package.json');
var ConsoleWriter = require('../lib/ConsoleWriter');
var args = process.argv;

program
    .version(package.version)
    .command('new [name]', 'Create a new visual')
    .command('info', 'Display info about the current visual')
    .command('start', 'Start the current visual')
    .command('package', 'Package the current visual into a pbiviz file');

//prepend logo to help screen
if (args.length === 2 || (args.length === 3 && args[2] === 'help')) {
    ConsoleWriter.logo();
}

program.parse(args);

ConsoleWriter.error("Invalid command. Run 'pbiviz help' for usage instructions.");
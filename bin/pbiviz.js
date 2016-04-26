#!/usr/bin/env node
var program = require('commander');
var package = require('../package.json');

program
    .version(package.version)
    .command('new [name]', 'Create a new visual')
    .command('start', 'Start the current visual')
    .command('package', 'Package the current visual into a pbiviz file')
    .parse(process.argv)


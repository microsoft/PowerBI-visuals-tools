"use strict";

let Jasmine = require('jasmine');
let SpecReporter = require('jasmine-spec-reporter');
let noop = function () { };

let jrunner = new Jasmine();
jrunner.configureDefaultReporter({ print: noop });
jasmine.getEnv().addReporter(new SpecReporter());
jrunner.loadConfigFile(); 
jrunner.execute();

"use strict";

var fs = require('fs-extra');
var path = require('path');
var exec = require('child_process').execSync;

const TEMP_DIR = path.join(__dirname, '..', '.tmp');
const BIN_PATH = path.join(__dirname, '..', '..', 'bin', 'pbiviz.js');
const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'templates');

class FileSystem {
    
    static getBinPath() {
        return BIN_PATH;
    }
    
    static getTempPath() {
        return TEMP_DIR;
    }
    
    static getTemplatePath() {
        return TEMPLATE_PATH;
    }

    /**
     * Creates the temp directory (deletes it first if it exists) 
     */    
    static resetTempDirectory() {
        FileSystem.deleteTempDirectory();
        fs.ensureDirSync(TEMP_DIR);
    }
    
    /**
     * Deletes the temporary directory if it exists
     */
    static deleteTempDirectory() {
        try {
            fs.removeSync(TEMP_DIR);
        } catch (e) { }        
    }
    
    /**
     * Executes the pbiviz CLI
     * @param {string} command - the command to be executed
     * @param {string} [arguments=''] - arguments for the command
     * @param {string} [flags=''] - command line flags
     * @param {boolean} [verbose = false] - the command to be executed
     */
    static runPbiviz(command, args, flags, verbose) {
        let opts = verbose ? undefined : { stdio: [] };
        flags = flags ? ' ' + flags : '';
        args = args ? ' ' + args : '';
        if(verbose) console.log('run:', 'node ' + BIN_PATH + ' ' + command + args + flags);
        
        return exec('node ' + BIN_PATH + ' ' + command + args + flags, opts);
    }
    
}

module.exports = FileSystem;
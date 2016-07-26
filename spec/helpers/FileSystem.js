"use strict";

var fs = require('fs-extra');
var path = require('path');
var childProcess = require('child_process');

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
        } catch (e) {
            console.log('DELETE ERROR', e);
        }
    }

    /**
     * Executes the pbiviz CLI
     * @param {string} command - the command to be executed
     * @param {string} [args=''] - arguments for the command
     * @param {string} [flags=''] - command line flags
     * @param {boolean} [verbose = false] - enables verbose output
     */
    static runPbiviz(command, args, flags, verbose) {
        let opts = verbose ? undefined : { stdio: [] };
        if (verbose) console.log('run:', 'node ' + BIN_PATH + ' ' + command + args + flags);

        flags = flags ? ' ' + flags : '';
        args = args ? ' ' + args : '';
        let pbivizCmd = command + args + flags;
        return childProcess.execSync('node ' + BIN_PATH + ' ' + pbivizCmd, opts);
    }

    /**
     * Executes the pbiviz CLI
     * @param {string} command - the command to be executed
     * @param {array} [args = []] - arguments for the command
     * @param {boolean} [verbose = false] - enables verbose output
     */
    static runPbivizAsync(command, args, verbose) {
        if (verbose) console.log('run:', 'node ' + BIN_PATH + ' ' + command, args || '');

        let spawnCmd = [BIN_PATH, command];
        if (args) spawnCmd = spawnCmd.concat(args);
        return childProcess.spawn('node', spawnCmd);
    }

}

module.exports = FileSystem;

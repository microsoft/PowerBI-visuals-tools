"use strict";

let fs = require('fs-extra');
let path = require('path');
let childProcess = require('child_process');
let psTree = require('ps-tree');
let async = require('async');
let platform = require('os').platform();

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
     * 
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
     * 
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

    /**
     * Kills a process on any platform
     * 
     * @param {object} process - id of the process to kill
     * @param {string} [signal] - signal to send ot the process
     * @param {function} [callback] - callback called after all processes are terminated
     */
    static killProcess(process, signal, callback) {
        if (platform === 'win32') {
            process.kill(signal);
            if (callback) callback();
        } else {
            let pid = process.pid || process.PID;
            psTree(pid, (error, children) => {
                async.each(children, (child, next) => {
                    FileSystem.killProcess(child, signal, next);
                }, (error) => {
                    process.kill(pid, signal);
                    if (callback) callback();
                });
            });
        }
    }

}

module.exports = FileSystem;

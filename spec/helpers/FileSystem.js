/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import fs from 'fs-extra';
import path from 'path';
import childProcess from 'child_process';
import treeKill from 'tree-kill';
import { getRootPath } from '../../lib/utils.js';

const rootPath = getRootPath();
const TEMP_DIR = path.join(rootPath, 'spec/.tmp');
const BIN_PATH = path.join(rootPath, 'bin/pbiviz.js');
const TEMPLATE_PATH = path.join(rootPath, 'templates');

export default class FileSystem {
    static expectFileToExist(fileName) {
        return new Promise((resolve, reject) => {
            fs.existsSync(fileName, (exist) => {
                if (exist) {
                    resolve(true);
                } else {
                    reject(new Error(`File ${fileName} was expected to exist but not found...`));
                }
            });
        });
    }

    static readFile(fileName) {
        return new Promise((resolve, reject) => {
            fs.readFile(fileName, 'utf-8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    static expectFileToMatch(fileName, regEx) {
        return FileSystem.readFile(fileName)
            .then((content) => {
                if (typeof regEx == 'string') {
                    if ((content).indexOf(regEx) == -1) {
                        throw new Error(`File "${fileName}" did not contain "${regEx}"...`);
                    }
                } else if (!(content).match(regEx)) {
                        throw new Error(`File "${fileName}" did not contain "${regEx}"...`);
                    }
            });
    }

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

        flags = flags ? ' ' + flags : '';
        args = args ? ' ' + args : '';
        let pbivizCmd = command + args + flags;
        if (verbose) { console.log('run:', 'node ' + BIN_PATH + ' ' + pbivizCmd); }
        return childProcess.execSync('node ' + BIN_PATH + ' ' + pbivizCmd, opts);
    }

    /**
     * Executes console commands
     * 
     * @param {string} command - the command to be executed
     * @param {string} pathToExec - path where to execute command
     * @param {string} pathToReturn - path to return after command execution
     */
    static runCMDCommand(command, pathToExec, pathToReturn) {
        process.chdir(pathToExec);
        childProcess.execSync('npm i --silent');
        if (pathToReturn) {
            process.chdir(pathToReturn);
        }
    }

    /**
     * Executes the pbiviz CLI
     * 
     * @param {string} command - the command to be executed
     * @param {array} [args = []] - arguments for the command
     * @param {boolean} [verbose = false] - enables verbose output
     */
    static runPbivizAsync(command, args, verbose) {
        if (verbose) { console.log('run:', 'node ' + BIN_PATH + ' ' + command, args || ''); }

        let spawnCmd = [BIN_PATH, command];
        if (args) { spawnCmd = spawnCmd.concat(args); }
        return childProcess.spawn('node', spawnCmd);
    }

    /**
     * Kills a process on any platform
     * 
     * @param {object} childProcess - child process to kill
     * @param {string} [signal] - signal to send ot the process
     * @param {function} [callback] - callback called after all processes are terminated
     */
    static killProcess(childProcess, signal, callback) {
        let pid = childProcess.pid || childProcess.PID;
        treeKill(pid, signal, (error) => {
            if (callback) {
                callback(error || null);
            }
        });
    }

}
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

let chalk = require('chalk');
let fs = require('fs');
let path = require('path');
let os = require('os');

if (os.platform() === 'darwin') {
    chalk = chalk.bold;
}

function prependLogTag(tag, args) {
    return [tag].concat(Array.from(args));
}

class ConsoleWriter {
    /** Causes the terminal to beep */
    static beep() {
        process.stdout.write("\x07");
    }

    /** Outputs a blank line */
    static blank() {
        console.info(chalk.reset(' '));
    }

    /**
     * Outputs arguments with the "done" tag / colors
     * 
     * @param {...*} arguments - arguments passed through to console.info
     */
    static done(/* arguments */) {
        let tag = chalk.bgGreen(' done  ');
        console.info.apply(this, prependLogTag(tag, arguments));
    }

    /**
     * Outputs arguments with the "info" tag / colors
     * 
     * @param {...*} arguments - arguments passed through to console.info
     */
    static info(/* arguments */) {
        let tag = chalk.bgCyan(' info  ');
        console.info.apply(this, prependLogTag(tag, arguments));
    }

    /**
     * Outputs arguments with the "warn" tag / colors
     * 
     * @param {...*} arguments - arguments passed through to console.warn
     */
    static warn(/* arguments */) {
        let tag = chalk.bgYellow.black(' warn  ');
        console.warn.apply(this, prependLogTag(tag, arguments));
    }

    /**
     * Outputs arguments with the "error" tag / colors
     * 
     * @param {...*} arguments - arguments passed through to console.error
     */
    static error(/* arguments */) {
        let tag = chalk.bgRed(' error ');
        console.error.apply(this, prependLogTag(tag, arguments));
    }

    /**
     * Outputs an object as a table
     * 
     * @param {string} data - object to output
     * @param {number} [depthLimit=Infinity] - limit the number of levels to recurse
     * @param {string} [keyPrefix=''] - text to prepend to each key
     */
    static infoTable(data, depthLimit, keyPrefix) {
        if (!data) return;
        let limit = typeof depthLimit === 'undefined' ? Infinity : depthLimit;
        for (let key in data) {
            let item = data[key];
            let itemKey = (keyPrefix || '') + key;
            if (limit > 1 && typeof item === 'object' && !Array.isArray(item)) {
                ConsoleWriter.infoTable(item, limit - 1, itemKey + '.');
            } else {
                ConsoleWriter.infoTableRow(itemKey, item);
            }
        }
    }

    /**
     * Outputs a table row with even spaced keys
     * 
     * @param {string} key - title of this row
     * @param {string} value - value for this row
     * @param {number} [keyWidth=30] - width used for padding of the key column
     */
    static infoTableRow(key, value, keyWidth) {
        let width = keyWidth || 30;
        let padding = Math.max(0, width - key.length);
        let paddedKey = chalk.bold(key) + (new Array(padding)).join('.');
        ConsoleWriter.info(paddedKey, value);
    }

    /**
     * Outputs formatted errors
     * 
     * @param {Array<Error>} errors
     */
    static formattedErrors(errors) {
        if (errors && Array.isArray(errors)) {
            errors.forEach((error) => {
                if (!error) return;
                let tag = error.type ? chalk.bold(error.type.toUpperCase()) : 'UNKNOWN';
                let file = error.filename ? chalk.bgWhite.black(` ${error.filename} `) + ':' : '';
                let position = (error.line && error.column) ? chalk.cyan(`(${error.line},${error.column})`) : '';
                let message = error.message || '';
                ConsoleWriter.error(tag, `${file} ${position} ${message}`);
            });
        } else {
            ConsoleWriter.error('UNKNOWN', errors);
        }
    }

    /**
     * Outputs ascii art of the PowerBI logo
     */
    static logo() {
        let logoText = fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo.txt')).toString();
        console.info(chalk.bold.yellow(logoText));
    }

    /**
     * Outputs validation log from PBIVIZ package checking
     */
    static validationLog(log) {

        // api/js/css/pkg
        let filterChecks = (attrCB, propCB) => {
            for (let checkname in log) {
                if (checkname !== 'valid') {
                    let checkpoint = log[checkname];
                    ConsoleWriter[checkpoint.error.length ? 'info' : 'done'](checkpoint.check);
                    attrCB(checkpoint, propCB);
                }
            }
        };

        // error/message/ok
        let filterCheckAttrs = (checkpoint, propCB) => {
            for (let propName in checkpoint) {
                if (propName !== 'message') {
                    let prop = checkpoint[propName];
                    if (typeof(prop) === 'object' && prop.length) {
                        propCB(prop, propName);
                    }
                }
            }
        };

        // col/line/text
        let filterAttrProps = (props, propName) => {
            props.forEach((opt) => {
                let result = [];
                for (let key in opt) {
                    result.push(opt[key]);
                }
                if (result.length) {
                    ConsoleWriter[propName === 'error' ? 'error' : 'warn'](result.join(' --> '));
                }
            });
        };

        filterChecks(filterCheckAttrs, filterAttrProps);

        let type = log.valid ? 'done' : 'error';
        let text = log.valid ? 'Valid package' : 'Invalid package';
        ConsoleWriter.blank();
        ConsoleWriter[type](text);
    }
}

module.exports = ConsoleWriter;

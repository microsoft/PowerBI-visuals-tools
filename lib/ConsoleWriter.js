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
import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getRootPath } from './utils.js';
const preferredChalk = os.platform() === 'darwin' ? chalk.bold : chalk;
function prependLogTag(tag, args) {
    return [tag].concat(args);
}
export default class ConsoleWriter {
    /** Causes the terminal to beep */
    static beep() {
        process.stdout.write("\x07");
    }
    /** Outputs a blank line */
    static blank() {
        console.info(preferredChalk.reset(' '));
    }
    /**
     * Outputs arguments with the "done" tag / colors
     *
     * @param {array} arguments - arguments passed through to console.info
     */
    static done(args) {
        const tag = preferredChalk.bgGreen(' done  ');
        console.info.apply(this, prependLogTag(tag, args));
    }
    /**
     * Outputs arguments with the "info" tag / colors
     *
     * @param {array} args - arguments passed through to console.info
     */
    static info(args) {
        const tag = preferredChalk.bgCyan(' info  ');
        console.info.apply(this, prependLogTag(tag, args));
    }
    /**
     * Outputs arguments with the "warn" tag / colors
     *
     * @param {array} args - arguments passed through to console.warn
     */
    static warning(args) {
        const tag = preferredChalk.bgYellow.black(' warn  ');
        console.warn.apply(this, prependLogTag(tag, args));
    }
    /**
     * Outputs arguments with the "error" tag / colors
     *
     * @param {array} args - arguments passed through to console.error
     */
    static error(args) {
        const tag = preferredChalk.bgRed(' error ');
        console.error.apply(this, prependLogTag(tag, args));
    }
    /**
     * Outputs an object as a table
     *
     * @param {string} data - object to output
     * @param {number} [depthLimit=Infinity] - limit the number of levels to recurse
     * @param {string} [keyPrefix=''] - text to prepend to each key
     */
    static infoTable(data, depthLimit, keyPrefix) {
        if (!data) {
            return;
        }
        const limit = typeof depthLimit === 'undefined' ? Infinity : depthLimit;
        for (const key in data) {
            const item = data[key];
            const itemKey = (keyPrefix || '') + key;
            if (limit > 1 && typeof item === 'object' && !Array.isArray(item)) {
                ConsoleWriter.infoTable(item, limit - 1, itemKey + '.');
            }
            else {
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
        const width = keyWidth || 30;
        const padding = Math.max(0, width - key.length);
        const paddedKey = preferredChalk.bold(key) + (new Array(padding)).join('.');
        ConsoleWriter.info([paddedKey, value]);
    }
    /**
     * Outputs formatted errors
     *
     * @param {Array<Error>} errors
     */
    static formattedErrors(errors) {
        if (errors && Array.isArray(errors)) {
            errors.forEach((error) => {
                if (!error) {
                    return;
                }
                const tag = error.type ? preferredChalk.bold(error.type.toUpperCase()) : 'UNKNOWN';
                const file = error.filename ? preferredChalk.bgWhite.black(` ${error.filename} `) + ':' : '';
                const position = (error.line && error.column) ? preferredChalk.cyan(`(${error.line},${error.column})`) : '';
                const message = error.message || '';
                ConsoleWriter.error([tag, `${file} ${position} ${message}`]);
            });
        }
        else {
            ConsoleWriter.error(['UNKNOWN', errors]);
        }
    }
    /**
     * Outputs ascii art of the PowerBI logo
     */
    static getLogoVisualization() {
        return fs.readFileSync(path.join(getRootPath(), 'assets', 'logo.txt')).toString();
    }
    /**
     * Outputs validation log from PBIVIZ package checking
     */
    static validationLog(log) {
        // api/js/css/pkg
        const filterChecks = (attrCB, propCB) => {
            for (const checkname in log) {
                if (checkname !== 'valid') {
                    const checkpoint = log[checkname];
                    ConsoleWriter[checkpoint.error.length ? 'info' : 'done'](checkpoint.check);
                    attrCB(checkpoint, propCB);
                }
            }
        };
        // error/message/ok
        const filterCheckAttrs = (checkpoint, propCB) => {
            for (const propName in checkpoint) {
                if (propName !== 'message') {
                    const prop = checkpoint[propName];
                    if (typeof (prop) === 'object' && prop.length) {
                        propCB(prop, propName);
                    }
                }
            }
        };
        // col/line/text
        const filterAttrProps = (props, propName) => {
            props.forEach((opt) => {
                const result = [];
                for (const key in opt) {
                    result.push(opt[key]);
                }
                if (result.length) {
                    ConsoleWriter[propName === 'error' ? 'error' : 'warn'](result.join(' --> '));
                }
            });
        };
        filterChecks(filterCheckAttrs, filterAttrProps);
        const type = log.valid ? 'done' : 'error';
        const text = log.valid ? 'Valid package' : 'Invalid package';
        ConsoleWriter.blank();
        ConsoleWriter[type](text);
    }
}

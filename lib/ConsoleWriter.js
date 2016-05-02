"use strict"

var chalk = require('chalk');

function prependLogTag(tag, args) {
    return [tag].concat(Array.from(args));
}

class ConsoleWriter {

    static beep() {
        process.stdout.write("\x07");
    }

    static blank() {
        console.info(' ');
    }

    static done(/* arguments */) {
        let tag = chalk.bgGreen(' done  ');
        console.info.apply(this, prependLogTag(tag, arguments));
    }    
    
    static info(/* arguments */) {
        let tag = chalk.bgCyan(' info  ');
        console.info.apply(this, prependLogTag(tag, arguments));
    }

    static warn(/* arguments */) {
        let tag = chalk.bgYellow.black(' warn  ');
        console.warn.apply(this, prependLogTag(tag, arguments));
    }    
    
    static error(/* arguments */) {
        let tag = chalk.bgRed(' error ');
        console.error.apply(this, prependLogTag(tag, arguments));
    }    
    
    static formattedErrors(errors) {
        if(errors && Array.isArray(errors)) {
            errors.forEach(function(error) {
                if(!error) return;
                let tag = error.type ? chalk.bold(error.type.toUpperCase()) : 'UNKNOWN';
                let file = error.filename ? chalk.bgWhite.black(` ${error.filename} `) : '';
                let position = (error.line && error.column) ? chalk.cyan(`(${error.line},${error.column})`) : '';
                let message = error.message || '';
                ConsoleWriter.error(tag, `${file} ${position}: ${message}`);
            });            
        } else {
            ConsoleWriter.error('UNKNOWN', errors);
        }
    }
    

}

module.exports = ConsoleWriter;
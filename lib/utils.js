const fs = require('fs-extra');
let https = require("https");
let path = require("path");

function download(url, pathToFile) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(pathToFile);
        https.get(url, (res) => {
            res.pipe(fileStream);
            fileStream.on('close', () => resolve(fileStream));
            res.on('error', (error) => reject(error));
        })
            .on('error', (error) => reject(error));
    });
}

function createFolder(folderName) {
    let folder = path.join("./", folderName);
    fs.ensureDirSync(folder);
    return folder;
}

function standardizeDate(date) {
    let dateArr = date[0].split(' ');
    let datePart = dateArr.shift();
    let dateObj = {
        time: (dateArr.length > 1) ? dateArr.join(' ') : dateArr
    };
    let locale = (new Intl.DateTimeFormat()).resolvedOptions().locale;
    let formatter = new Intl.DateTimeFormat(locale).formatToParts();
    let literal = formatter[1].value;
    let dateSplitted = datePart.split(literal);
    let formatPattern = formatter.map(function (el) {
        switch (el.type) {
            case 'month':
                return 'month';
            case 'day':
                return 'day';
            case 'year':
                return 'year';
            default:
                return el.value;
        }
    }).join('');
    formatPattern.split(literal).map((el, idx) => {
        dateObj[el] = dateSplitted[idx];
    });
    let dateStandardized = `${dateObj.year}-${dateObj.month}-${dateObj.day} ${dateObj.time}`;
    return dateStandardized;
}

module.exports = { 
    download,
    createFolder,
    standardizeDate
 };

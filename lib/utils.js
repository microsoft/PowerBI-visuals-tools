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

module.exports = { 
    download,
    createFolder
 };

let fs = require('fs-extra');

let readdirSyncRecursive = (baseDir) => {
    let read = (dir) => {
        let results = [];
        let list = fs.readdirSync(dir);
        list.forEach((file) => {
            file = dir + '/' + file;
            let stat = fs.statSync(file);
            if (stat && stat.isDirectory()) { 
                /* Recurse into a subdirectory */
                results = results.concat(read(file));
            } else { 
                /* Is a file */
                results.push(file.replace(baseDir, ""));
            }
        });
        return results;
    };
    return read(baseDir);
};

module.exports.readdirSyncRecursive = readdirSyncRecursive;

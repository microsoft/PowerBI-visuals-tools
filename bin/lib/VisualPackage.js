var fs = require('fs-extra');
var path = require('path');

var scriptPath = __dirname;
var templatePath = path.resolve(scriptPath + '/../../template');

/**
 * Represents an instance of a visual package based on file path
 * @param {string} path - file path to root of visual package
 */
function VisualPackage(path) {
    this.path = path;
}

/**
 * Creates a new visual package from the template 
 * @throws - throws io errors wrap in try/catch
 */
VisualPackage.prototype.create = function(force) {
    if(this.exists()) {
        if(force) {
            fs.removeSync(this.path);
        }
        else {
            throw new Error('This visual already exists. Use force to overwrite.');
        }
    }
    fs.copySync(templatePath, this.path);
};

/**
 * Checks if the visual package path exists (directory)
 * @returns {boolean}
 */
VisualPackage.prototype.exists = function() {
    return fs.existsSync(this.path);
};

/**
 * Checks if the visual package is valid
 * For now this just checks if there is a pbiviz.json this could do more later
 * @returns {boolean}
 */
VisualPackage.prototype.valid = function() {
    return fs.existsSync(path.join(this.path, 'pbiviz.json'));
};

module.exports = VisualPackage;
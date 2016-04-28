var fs = require('fs-extra');
var path = require('path');
var Guid = require('guid');
var jsonfile = require('jsonfile');

var scriptPath = __dirname;
var templatePath = path.resolve(scriptPath + '/../templates/visual');

/**
 * Represents an instance of a visual package based on file path
 * @param {string} path - file path to root of visual package
 */
function VisualPackage(path) {
    this.path = path;
}

/**
 * Generates a random GUID for your visual
 */
function generateGuid(){
    var guid = 'PBI-CV-' + Guid.raw();
    return guid.replace(new RegExp('-', 'g'), '_').toUpperCase();
}

/**
 * Generates a default pbiviz.json config file
 * @param {string} filepath - file path to root of visual package
 */
function generatePbiVizJson(filepath){     
    var json = {
        "guid": generateGuid(),
        "author": {
            "name": "Mickey Mouse",
            "email": "disney@email.com"
        },
        "version":"0.1.0"
    };
    jsonfile.writeFileSync(path.join(filepath,'pbiviz.json'), json,{spaces: 2});
}

/**
 * Creates a new visual package from the template 
 * @throws - throws io errors (wrap in try/catch)
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
    generatePbiVizJson(this.path);
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

/**
 * Loads the config data from the pbiviz.json file
 * @returns {Object} - pbiviz object
 * @throws - thows error if the json is invalid or not found (wrap in try/catch)
 */
VisualPackage.prototype.getConfig = function() {
    return require(path.join(this.path, 'pbiviz.json'));
}

module.exports = VisualPackage;
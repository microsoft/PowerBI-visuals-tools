"use strict";

let fs = require('fs-extra');
let path = require('path');
let _ = require('lodash');
let JSZip = require('jszip');
let config = require('../config.json');

const PACKAGE_TEMPLATE_PATH = path.join(__dirname, '..', config.templates.package);

/**
 * Generates the package.json for a pbiviz file
 */
function generatePackageJson(visualConfig) {
    let templateOptions = {
        visualData: visualConfig.visual || {},
        authorData: visualConfig.author || {},
        guid: visualConfig.visual.guid
    };    
    let packageTemplate = fs.readFileSync(PACKAGE_TEMPLATE_PATH);
    return _.template(packageTemplate)(templateOptions);    
}

/**
 * Builds a pbiviz file from a visual package instance
 */
class PbivizBuilder {
    /**
     * Creates a VisualBuilder
     * @param {string} visualPackage - an instace of a visual package to build
     * @param {string} [pluginName=visual.guid] - visual plugin name
     */
    constructor(visualPackage) {
        this.visualPackage = visualPackage;
    }

    /**
     * Creates a pbiviz file from a visual package
     */
    build() {
        return new Promise((resolve, reject) => {
            let visualPackage = this.visualPackage;
            let visualConfig = visualPackage.config;
            let guid = visualConfig.visual.guid;
            let srcPath = visualPackage.buildPath(config.build.dropFolder);
            let pbivizPath = visualPackage.buildPath(config.package.dropFolder, `${visualConfig.visual.name}.pbiviz`);
            
            fs.ensureDirSync(path.dirname(pbivizPath));
            
            let zip = new JSZip();
            
            zip.file('package.json', generatePackageJson(visualConfig));
            
            let resources = zip.folder("resources");
            let pbivizJsonContent =  fs.readFileSync(path.join(srcPath, 'pbiviz.json'));
            resources.file(`${guid}.pbiviz.json`, pbivizJsonContent);
            
            zip.generateAsync({type:'nodebuffer'})
                .then(content => fs.writeFileSync(pbivizPath, content))
                .then(resolve).catch(reject);
        });
    }
}

module.exports = PbivizBuilder;
"use strict";

let fs = require('fs-extra');
let path = require('path');
let _ = require('lodash');
let JSZip = require('jszip');
let config = require('../config.json');

const PACKAGE_TEMPLATE_PATH = path.join(__dirname, '..', config.templates.package);
const ICON_TEMPLATE_PATH = path.join(__dirname, '..', config.templates.iconCss);

/**
 * Generates the package.json for a pbiviz file
 */
function generatePackageJson(visualConfig) {
    let templateOptions = {
        visualData: visualConfig.visual || {},
        authorData: visualConfig.author || {}
    };    
    let packageTemplate = fs.readFileSync(PACKAGE_TEMPLATE_PATH);
    return _.template(packageTemplate)(templateOptions);    
}

/**
 * Validates that the icon is valid
 * (20x20 png) 
 */
function validateIcon(image) {
    if (image.toString('ascii', 1, 8) !== 'PNG\r\n\x1a\n') return false;
    if (image.toString('ascii', 12, 16) !== 'IHDR') return false;

    var width = image.readUInt32BE(16);
    var height = image.readUInt32BE(20);
    return width == 20 && height == 20; 
}

/**
 * Loads icon png file and converts it to base 64 string
 */
function getBase64Icon(iconPath) {
    let icon = fs.readFileSync(iconPath);
    return validateIcon(icon) ? icon.toString('base64') : false;
}

/**
 * Loads icon and appends it to the existing css
 */
function appendIconCss(guid, icon, cssContent) {
    let iconOptions = {
        guid: guid,
        icon: icon
    };
    let iconTemplate = fs.readFileSync(ICON_TEMPLATE_PATH);
    return cssContent + "\n" + _.template(iconTemplate)(iconOptions); 
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
            let pbivizPath = visualPackage.buildPath(config.package.dropFolder, 'VisualName.pbiviz');
            
            fs.ensureDirSync(path.dirname(pbivizPath));
            
            let icon = getBase64Icon(visualConfig.assets.icon);
            if(!icon) return reject(new Error('Invalid Icon. Must be 20x20 png.'));
            
            let zip = new JSZip();
            
            zip.file('package.json', generatePackageJson(visualConfig));
            
            let resources = zip.folder("resources");
            let files = fs.readdirSync(srcPath);
            files.forEach(file => {
                let content = fs.readFileSync(path.join(srcPath,file));
                if(file === 'visual.css') {
                    content = appendIconCss(guid, icon, content);
                }
                resources.file(file, content);
            });
            
            zip.generateAsync({type:'nodebuffer'})
                .then(content => fs.writeFileSync(pbivizPath, content))
                .then(resolve).catch(reject);
        });
    }
}

module.exports = PbivizBuilder;
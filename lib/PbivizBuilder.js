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

const defaultOptions = {
    resources: false,
    pbiviz: true
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
    constructor(visualPackage, options) {
        this.visualPackage = visualPackage;
        this.options = _.defaults(options, defaultOptions);
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
            let dropPath = config.package.dropFolder;
            
            fs.ensureDirSync(dropPath);

            let promises = [];

            if (this.options.resources) {
                promises.push(new Promise(function (resolve, reject) {
                    let resourcePath = path.join(dropPath, 'resources');
                    fs.removeSync(resourcePath);
                    fs.ensureDirSync(resourcePath);
                    fs.copySync(path.join(srcPath,'visual.prod.css'), path.join(resourcePath,'visual.prod.css'));
                    fs.copySync(path.join(srcPath,'visual.prod.js'), path.join(resourcePath,'visual.prod.js'));
                    fs.copySync(path.join(srcPath,'pbiviz.json'), path.join(resourcePath,'pbiviz.json'));
                }));
            }

            if (this.options.pbiviz) {
                let pbivizJsonContent = fs.readFileSync(path.join(srcPath, 'pbiviz.json'));
                let packageJsonContent = generatePackageJson(visualConfig);
                let pbivizPath = visualPackage.buildPath(dropPath, `${visualConfig.visual.name}.pbiviz`);
                let zip = new JSZip();
                zip.file('package.json', packageJsonContent);
                let resources = zip.folder("resources");
                resources.file(`${guid}.pbiviz.json`, pbivizJsonContent);
                zip.generateAsync({ type: 'nodebuffer' })
                    .then(content => fs.writeFileSync(pbivizPath, content))
                    .then(resolve).catch(reject);
            }

            Promise.all(promises).then(resolve).catch(reject);
        });
    }
}

module.exports = PbivizBuilder;
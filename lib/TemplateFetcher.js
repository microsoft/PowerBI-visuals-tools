const fs = require('fs-extra');
const path = require('path');
const config = require('../config.json');
const JSZip = require('jszip');
const request = require('request');
const VisualGenerator = require("./VisualGenerator");
const { exec } = require('child_process');
let ConsoleWriter = require('../lib/ConsoleWriter');

class TemplateFetcher {
    constructor({ templateName, visualName, apiVersion }) {
        this.templateName = templateName;
        this.visualName = visualName;
        this.folderName = `powerbi-visuals-${this.visualName}`;
        this.apiVersion = apiVersion;
        console.log();
    }

    fetch() {
        this.createFolder()
            .then(this.download.bind(this))
            .then(this.extractFiles.bind(this))
            .then(this.removeZipFile.bind(this))
            .then(this.setVisualGUID.bind(this))
            .then(this.setApiVersion.bind(this))
            .then(this.runNpmInstall.bind(this))
            .then(this.showNextSteps.bind(this));
    }

    async createFolder() {
        let folder = path.join("./", this.folderName);
        await fs.ensureDir(folder);
        return folder;
    }

    download(folder) {
        return new Promise((resolve) => {
            const templateUrl = config.visualTemplates[this.templateName];
            const fileName = path.join(folder, "template.zip");
            const fileStream = fs.createWriteStream(`.${path.sep}${fileName}`);

            request.get(templateUrl, (err) => {
                if (err) {
                    reject(err);
                }
            })
            .pipe(fileStream)
            .on("close", () => resolve(fileStream));
        });
    }

    async removeZipFile() {
        const folder = path.join("./", this.folderName);
        const fileName = path.join(folder, "template.zip");
        await fs.unlink(`.${path.sep}${fileName}`, (err) => {
            if (err) {
                ConsoleWriter.warn(`.${path.sep}${fileName} was not deleted`);
            }
        });
    }

    async extractFiles(file) {
        const filePath = path.join(process.cwd(), file.path);
        const buffer = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(buffer);

        const filesList =  Object.keys(zip.files);
        for (const filename of filesList) {
            if (filename[filename.length - 1] === "/") {
                // generate folders                            for exclude parent folder
                const dest = path.join(path.dirname(filePath), path.join(filename, ".."));
                await fs.ensureDir(dest);
            } else {
                // write files into dirs                       for exclude parent folder
                const dest = path.join(path.dirname(filePath), path.join(path.dirname(filename), "..", filename.split("/").pop(0)));
                const content = await zip.file(filename).async('nodebuffer');
                await fs.writeFile(dest, content);
            }
        }
    }

    async setApiVersion() {
        if (!this.apiVersion) {
            return;
        }
        ConsoleWriter.info(`Set Visual API to ${this.apiVersion}`);
        const packageJsonFile = path.join(process.cwd(), this.folderName, "package.json");
        const packageJson = await fs.readJson(packageJsonFile);
        if (packageJson.devDependencies && packageJson.devDependencies["powerbi-visuals-api"]) {
            packageJson.devDependencies["powerbi-visuals-api"] = `~${this.apiVersion}`;
        }
        if (packageJson.dependencies && packageJson.dependencies["powerbi-visuals-api"]) {
            packageJson.dependencies["powerbi-visuals-api"] = `~${this.apiVersion}`;
        }
        await fs.writeJSON(packageJsonFile, packageJson);
    }

    async setVisualGUID() {
        const pbivizJsonFile = path.join(process.cwd(), this.folderName, "pbiviz.json");
        const pbivizJson = await fs.readJson(pbivizJsonFile);
        pbivizJson.visual.guid = this.visualName + VisualGenerator.generateVisualGuid();
        await fs.writeJSON(pbivizJsonFile, pbivizJson);
    }

    runNpmInstall() {
        return new Promise((resolve, reject) => {
            ConsoleWriter.info("Installing packages...");
            process.chdir(this.folderName);
            // const { stdout, stderr } = await exec('ls');
            const child = exec('npm install', (error, stdout, stderr) => {
                if (error) {
                    ConsoleWriter.error(error.stack);
                    ConsoleWriter.error(`Error code: ${error.code}`);
                    ConsoleWriter.error(`Signal received: ${error.signal}`);
                }
                ConsoleWriter.warn(stderr);
                ConsoleWriter.info(stdout);
                resolve();
            });
            child.on("error", (er) => {
                ConsoleWriter.log(er);
                reject();
            });
            child.on("exit", (code) => {
                if (code !== 0) {
                    ConsoleWriter.error(`npm install stopped with code ${code}`);
                    reject();
                }
            });
        });
    }

    showNextSteps() {
        ConsoleWriter.blank();
        ConsoleWriter.info("Run `npm run start` to start visual development");
        ConsoleWriter.info("Run `npm run package` to create visual package");
    }
}

module.exports = TemplateFetcher;

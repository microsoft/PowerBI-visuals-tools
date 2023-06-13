import { createFolder, download, readJsonFromRoot } from './utils.js';
import ConsoleWriter from './ConsoleWriter.js';
import JSZip from 'jszip';
import VisualGenerator from "./VisualGenerator.js";
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
const config = readJsonFromRoot('config.json');
export default class TemplateFetcher {
    templateName;
    visualName;
    folderName;
    apiVersion;
    constructor(templateName, visualName, apiVersion) {
        this.templateName = templateName;
        this.visualName = visualName;
        this.folderName = `${this.visualName}`;
        this.apiVersion = apiVersion;
    }
    fetch() {
        const folder = createFolder.call(this, this.folderName);
        download.call(this, config.visualTemplates[this.templateName], path.join(folder, "template.zip"))
            .then(this.extractFiles.bind(this))
            .then(this.removeZipFile.bind(this))
            .then(this.setVisualGUID.bind(this))
            .then(this.setApiVersion.bind(this))
            .then(this.runNpmInstall.bind(this))
            .then(this.showNextSteps.bind(this));
    }
    async removeZipFile() {
        const folder = path.join("./", this.folderName);
        const fileName = path.join(folder, "template.zip");
        await fs.unlink(`.${path.sep}${fileName}`, (err) => {
            if (err) {
                ConsoleWriter.warning(`.${path.sep}${fileName} was not deleted`);
            }
        });
    }
    async extractFiles(file) {
        const filePath = path.join(process.cwd(), file.path);
        const buffer = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(buffer);
        const filesList = Object.keys(zip.files);
        for (const filename of filesList) {
            if (filename[filename.length - 1] === "/") {
                // generate folders                            for exclude parent folder
                const dest = path.join(path.dirname(filePath), path.join(filename, ".."));
                await fs.ensureDir(dest);
            }
            else {
                // write files into dirs                       for exclude parent folder
                const dest = path.join(path.dirname(filePath), path.join(path.dirname(filename), "..", filename.split("/").pop() ?? ""));
                const content = await zip.file(filename)?.async('nodebuffer');
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
                ConsoleWriter.warning(stderr);
                ConsoleWriter.info(stdout);
                resolve(true);
            });
            child.on("error", (er) => {
                ConsoleWriter.error(er);
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

import fs from 'fs-extra';
import https from "https";
import path from "path";
import { fileURLToPath } from 'node:url';

export function download(url, pathToFile) {
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

export function createFolder(folderName): string {
    const folder = path.join("./", folderName);
    fs.ensureDirSync(folder);
    return folder;
}

export function getRootPath(): string {
    const pathToDirectory = fileURLToPath(import.meta.url);
    return path.join(pathToDirectory, "..", "..");
}

export function getJsPath(filePath: string) {
    return filePath.replace(/\.json$/, '.mjs');
}

async function safelyImport(filePath: string) {
    return fs.existsSync(filePath) && (await import(`file://${filePath}`)).default;
}

function safelyParse(filePath: string) {
    return fs.existsSync(filePath) && JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export async function readJsonFromRoot(jsonFilename: string) {
    const jsonPath = path.join(getRootPath(), jsonFilename);
    const jsPath = getJsPath(jsonPath);
    return (await safelyImport(jsPath)) || safelyParse(jsonPath);
}

export async function readJsonFromVisual(filePath: string, visualPath?: string) {
    const jsonPath = path.join(visualPath ?? process.cwd(), filePath);
    const jsPath = getJsPath(jsonPath);
    return (await safelyImport(jsPath)) || safelyParse(jsonPath);
}

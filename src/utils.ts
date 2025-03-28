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
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        return (await import(`file://${filePath}`)).default;
    } catch (e) {
        console.error(`Error importing JS config from ${filePath}`, e);
        return null;
    }
}

function safelyParse(filePath: string) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
    catch (e) {
        console.error(`Error parsing JSON config from ${filePath}`, e);
        return null;
    }
}

export async function readJsonFromRoot(jsonFileName: string) {
    const jsonPath = path.join(getRootPath(), jsonFileName);
    const jsPath = getJsPath(jsonPath);
    const content = (await safelyImport(jsPath)) || safelyParse(jsonPath)
    if(!content) throw new Error(`${jsonFileName} file not found`)
    return content
}

export async function readJsonFromVisual(filePath: string, visualPath?: string) {
    const jsonPath = path.join(visualPath ?? process.cwd(), filePath);
    const jsPath = getJsPath(jsonPath);
    const content = (await safelyImport(jsPath)) || safelyParse(jsonPath)
    if(!content) throw new Error(`${filePath} file not found`)
    return content
}

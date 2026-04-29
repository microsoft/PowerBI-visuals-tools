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

export async function getSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.tmp') {
            files.push(...await getSourceFiles(fullPath));
        } else if (/\.(ts|js|tsx|jsx)$/.test(entry.name)) {
            files.push(fullPath);
        }
    }
    return files;
}

export function existsIgnoreCase(filePath: string): boolean {
    const dir = path.dirname(filePath);
    const name = path.basename(filePath).toLowerCase();
    try {
        const entries: string[] = fs.readdirSync(dir);
        return entries.some(entry => entry.toLowerCase() === name);
    } catch {
        return false;
    }
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

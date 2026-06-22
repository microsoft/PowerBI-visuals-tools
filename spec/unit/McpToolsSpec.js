/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import fs from 'fs-extra';
import path from 'path';
import { getRootPath, getSourceFiles, existsIgnoreCase } from '../../lib/utils.js';
import { getVisualInfo } from '../../lib/mcp/tools/visualInfo.js';
import { checkVulnerabilities } from '../../lib/mcp/tools/vulnerabilities.js';
import { prepareCertification } from '../../lib/mcp/tools/certification.js';
import { getBestPractices } from '../../lib/mcp/tools/bestPractices.js';
import { getAvailableApis } from '../../lib/mcp/tools/availableApis.js';
import { initMcpConfig } from '../../lib/mcp/McpServer.js';

const rootPath = getRootPath();
const tempDir = path.join(rootPath, 'spec/.tmp/mcpTest');

function createMockVisual(dir) {
    fs.ensureDirSync(dir);
    fs.ensureDirSync(path.join(dir, 'src'));
    fs.ensureDirSync(path.join(dir, 'assets'));

    fs.writeJsonSync(path.join(dir, 'pbiviz.json'), {
        visual: {
            name: "testVisual",
            displayName: "Test Visual",
            guid: "testVisualAAFF1234567890",
            version: "1.0.0.0",
            description: "A test visual",
            supportUrl: "https://example.com"
        },
        apiVersion: "5.3.0",
        author: { name: "Test Author", email: "test@test.com" }
    });

    fs.writeJsonSync(path.join(dir, 'capabilities.json'), {
        dataRoles: [
            { displayName: "Category", name: "category", kind: "Grouping" },
            { displayName: "Measure", name: "measure", kind: "Measure" }
        ],
        dataViewMappings: [{ categorical: { categories: { for: { in: "category" } } } }],
        objects: {},
        supportsHighlight: true,
        supportsKeyboardFocus: true
    });

    fs.writeJsonSync(path.join(dir, 'package.json'), {
        name: "test-visual",
        version: "1.0.0",
        dependencies: { "powerbi-visuals-api": "5.11.0" },
        devDependencies: { "eslint": "^9.0.0", "typescript": "5.5.4" }
    });

    fs.writeJsonSync(path.join(dir, 'tsconfig.json'), { compilerOptions: { strict: true } });

    // Create a source file with rendering events
    fs.writeFileSync(path.join(dir, 'src', 'visual.ts'), `
import powerbi from "powerbi-visuals-api";
export class Visual {
    private events;
    constructor(options) {
        this.events = options.host.eventService;
    }
    public update(options) {
        this.events.renderingStarted(options);
        // render logic
        this.events.renderingFinished(options);
    }
    public handleError(options, e) {
        this.events.renderingFailed(options, e);
    }
}
`);

    // Icon
    fs.writeFileSync(path.join(dir, 'assets', 'icon.png'), 'fake-icon');
}

function createVulnerableVisual(dir) {
    createMockVisual(dir);
    fs.writeFileSync(path.join(dir, 'src', 'dangerous.ts'), `
const x = eval("1+1");
const fn = new Function("return 1");
element.innerHTML = userInput;
document.write("<p>hello</p>");
fetch("https://evil.com/data");
// eval("commented out eval");
/* fetch("block comment fetch") */
`);
}

describe("MCP Tools", () => {

    beforeEach(() => {
        fs.removeSync(tempDir);
        fs.ensureDirSync(tempDir);
    });

    afterAll(() => {
        fs.removeSync(tempDir);
    });

    // ===== getVisualInfo =====
    describe("getVisualInfo", () => {
        it("-> should return visual info for a valid project", async () => {
            const projectDir = path.join(tempDir, 'infoVisual');
            createMockVisual(projectDir);

            const result = await getVisualInfo(projectDir);
            expect(result).toContain('testVisual');
            expect(result).toContain('Test Visual');
            expect(result).toContain('5.3.0');
            expect(result).toContain('Test Author');
            expect(result).toContain('category');
            expect(result).toContain('measure');
        });

        it("-> should return error for non-visual project", async () => {
            const emptyDir = path.join(tempDir, 'emptyProject');
            fs.ensureDirSync(emptyDir);

            const result = await getVisualInfo(emptyDir);
            expect(result).toContain('Not a Power BI Visual Project');
        });
    });

    // ===== checkVulnerabilities =====
    describe("checkVulnerabilities", () => {
        it("-> should report no vulnerabilities for clean project", async () => {
            const projectDir = path.join(tempDir, 'cleanVisual');
            createMockVisual(projectDir);

            const result = await checkVulnerabilities(projectDir);
            expect(result).toContain('No vulnerabilities detected');
        });

        it("-> should detect dangerous patterns in source code", async () => {
            const projectDir = path.join(tempDir, 'vulnVisual');
            createVulnerableVisual(projectDir);

            const result = await checkVulnerabilities(projectDir);
            expect(result).toContain('eval()');
            expect(result).toContain('Function');
            expect(result).toContain('innerHTML');
            expect(result).toContain('document.write');
            expect(result).toContain('fetch()');
        });

        it("-> should detect commented-out dangerous code as info severity", async () => {
            const projectDir = path.join(tempDir, 'commentedVuln');
            createVulnerableVisual(projectDir);

            const result = await checkVulnerabilities(projectDir);
            expect(result).toContain('commented out');
            expect(result).toContain('Info');
        });

        it("-> should handle missing src directory gracefully", async () => {
            const projectDir = path.join(tempDir, 'noSrc');
            fs.ensureDirSync(projectDir);
            fs.writeJsonSync(path.join(projectDir, 'package.json'), { dependencies: {} });

            const result = await checkVulnerabilities(projectDir);
            expect(result).not.toContain('Error');
        });
    });

    // ===== prepareCertification =====
    describe("prepareCertification", () => {
        it("-> should pass checks for a well-configured project", async () => {
            const projectDir = path.join(tempDir, 'certVisual');
            createMockVisual(projectDir);

            const result = await prepareCertification(projectDir);
            expect(result).toContain('pbiviz.json');
            expect(result).toContain('capabilities.json');
            expect(result).toContain('package.json');
            expect(result).toContain('tsconfig.json');
        });

        it("-> should fail checks for missing required files", async () => {
            const projectDir = path.join(tempDir, 'incompleteCert');
            fs.ensureDirSync(projectDir);

            const result = await prepareCertification(projectDir);
            expect(result).toContain('fail');
        });

        it("-> should check rendering events", async () => {
            const projectDir = path.join(tempDir, 'renderVisual');
            createMockVisual(projectDir);

            const result = await prepareCertification(projectDir);
            expect(result).toContain('Rendering Events');
        });

        it("-> should check for icon asset", async () => {
            const projectDir = path.join(tempDir, 'iconVisual');
            createMockVisual(projectDir);

            const result = await prepareCertification(projectDir);
            expect(result).toContain('icon');
        });
    });

    // ===== getBestPractices =====
    describe("getBestPractices", () => {
        it("-> should return static practices when no rootPath", async () => {
            const result = await getBestPractices();
            expect(result).toContain('Best Practices');
        });

        it("-> should scan project and return results with rootPath", async () => {
            const projectDir = path.join(tempDir, 'practicesVisual');
            createMockVisual(projectDir);

            const result = await getBestPractices(projectDir);
            expect(result).toContain('Best Practices');
            expect(result).toContain('practicesVisual');
        });

        it("-> should return static practices for non-existent path", async () => {
            const result = await getBestPractices('/non/existent/path');
            expect(result).toContain('Best Practices');
        });
    });

    // ===== getAvailableApis =====
    describe("getAvailableApis", () => {
        it("-> should return all APIs when category is 'all'", async () => {
            const result = await getAvailableApis('all');
            expect(result).toContain('fetchMoreData');
            expect(result).toContain('selectionManager');
            expect(result).toContain('tooltipService');
            expect(result).toContain('colorPalette');
        });

        it("-> should filter by 'data' category", async () => {
            const result = await getAvailableApis('data');
            expect(result).toContain('fetchMoreData');
            expect(result).not.toContain('selectionManager');
        });

        it("-> should filter by 'interaction' category", async () => {
            const result = await getAvailableApis('interaction');
            expect(result).toContain('selectionManager');
            expect(result).toContain('tooltipService');
        });

        it("-> should filter by 'formatting' category", async () => {
            const result = await getAvailableApis('formatting');
            expect(result).toContain('colorPalette');
        });

        it("-> should filter by 'utility' category", async () => {
            const result = await getAvailableApis('utility');
            expect(result).toContain('storageService');
        });

        it("-> should return error message for invalid category", async () => {
            const result = await getAvailableApis('invalid');
            expect(result).toContain('No APIs found');
            expect(result).toContain('Available categories');
        });

        it("-> should show API usage when rootPath is provided", async () => {
            const projectDir = path.join(tempDir, 'apiVisual');
            createMockVisual(projectDir);

            const result = await getAvailableApis('all', projectDir);
            expect(result).toContain('renderingStarted');
        });
    });

    // ===== initMcpConfig =====
    describe("initMcpConfig", () => {
        it("-> should create .vscode/mcp.json", async () => {
            const projectDir = path.join(tempDir, 'initVisual');
            fs.ensureDirSync(projectDir);

            await initMcpConfig(projectDir);

            const mcpPath = path.join(projectDir, '.vscode', 'mcp.json');
            expect(fs.existsSync(mcpPath)).toBeTrue();

            const config = fs.readJsonSync(mcpPath);
            expect(config.servers).toBeDefined();
            expect(config.servers.pbiviz).toBeDefined();
            expect(config.servers.pbiviz.command).toBe('npx');
            expect(config.servers.pbiviz.args).toContain('powerbi-visuals-tools');
            expect(config.servers.pbiviz.args).toContain('-y');
            expect(config.servers.pbiviz.args).toContain('mcp');
        });

        it("-> should not overwrite existing mcp.json", async () => {
            const projectDir = path.join(tempDir, 'existingMcp');
            const vscodeDir = path.join(projectDir, '.vscode');
            fs.ensureDirSync(vscodeDir);
            fs.writeJsonSync(path.join(vscodeDir, 'mcp.json'), { custom: true });

            await initMcpConfig(projectDir);

            const config = fs.readJsonSync(path.join(vscodeDir, 'mcp.json'));
            expect(config.custom).toBeTrue();
        });
    });

    // ===== getSourceFiles (shared util) =====
    describe("getSourceFiles", () => {
        it("-> should find .ts and .js files in directory", async () => {
            const dir = path.join(tempDir, 'sourceFiles');
            fs.ensureDirSync(dir);
            fs.writeFileSync(path.join(dir, 'test.ts'), '');
            fs.writeFileSync(path.join(dir, 'test.js'), '');
            fs.writeFileSync(path.join(dir, 'test.css'), '');
            fs.writeFileSync(path.join(dir, 'test.json'), '');

            const files = await getSourceFiles(dir);
            expect(files.length).toBe(2);
            expect(files.some(f => f.endsWith('test.ts'))).toBeTrue();
            expect(files.some(f => f.endsWith('test.js'))).toBeTrue();
        });

        it("-> should find files recursively in subdirectories", async () => {
            const dir = path.join(tempDir, 'nested');
            fs.ensureDirSync(path.join(dir, 'sub'));
            fs.writeFileSync(path.join(dir, 'root.ts'), '');
            fs.writeFileSync(path.join(dir, 'sub', 'nested.ts'), '');

            const files = await getSourceFiles(dir);
            expect(files.length).toBe(2);
        });

        it("-> should exclude node_modules directory", async () => {
            const dir = path.join(tempDir, 'withNodeModules');
            fs.ensureDirSync(path.join(dir, 'node_modules'));
            fs.writeFileSync(path.join(dir, 'app.ts'), '');
            fs.writeFileSync(path.join(dir, 'node_modules', 'lib.js'), '');

            const files = await getSourceFiles(dir);
            expect(files.length).toBe(1);
            expect(files[0]).toContain('app.ts');
        });

        it("-> should exclude .tmp directory", async () => {
            const dir = path.join(tempDir, 'withTmp');
            fs.ensureDirSync(path.join(dir, '.tmp'));
            fs.writeFileSync(path.join(dir, 'app.ts'), '');
            fs.writeFileSync(path.join(dir, '.tmp', 'temp.js'), '');

            const files = await getSourceFiles(dir);
            expect(files.length).toBe(1);
            expect(files[0]).toContain('app.ts');
        });

        it("-> should return empty array for non-existent directory", async () => {
            const files = await getSourceFiles('/non/existent/dir');
            expect(files.length).toBe(0);
        });
    });

    // ===== existsIgnoreCase (shared util) =====
    describe("existsIgnoreCase", () => {
        it("-> should find file with exact case match", () => {
            const dir = path.join(tempDir, 'caseTest');
            fs.ensureDirSync(dir);
            fs.writeFileSync(path.join(dir, 'README.md'), '');

            expect(existsIgnoreCase(path.join(dir, 'README.md'))).toBeTrue();
        });

        it("-> should find file with different case", () => {
            const dir = path.join(tempDir, 'caseTest2');
            fs.ensureDirSync(dir);
            fs.writeFileSync(path.join(dir, 'readme.md'), '');

            expect(existsIgnoreCase(path.join(dir, 'README.md'))).toBeTrue();
        });

        it("-> should return false for non-existent file", () => {
            const dir = path.join(tempDir, 'caseTest3');
            fs.ensureDirSync(dir);

            expect(existsIgnoreCase(path.join(dir, 'MISSING.md'))).toBeFalse();
        });

        it("-> should return false for non-existent directory", () => {
            expect(existsIgnoreCase('/non/existent/dir/file.txt')).toBeFalse();
        });
    });
});

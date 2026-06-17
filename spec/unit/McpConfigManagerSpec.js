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
import { getRootPath } from '../../lib/utils.js';
import {
    MCP_SERVER_NAME,
    MCP_NEXT_STEPS,
    isServerConfigured,
    configureMcpConfig
} from '../../lib/McpConfigManager.js';

const rootPath = getRootPath();
const tempDir = path.join(rootPath, 'spec/.tmp/mcpConfigManagerTest');

function mcpConfigPath(projectDir) {
    return path.join(projectDir, '.vscode', 'mcp.json');
}

describe("McpConfigManager", () => {
    beforeEach(() => {
        fs.removeSync(tempDir);
        fs.ensureDirSync(tempDir);
    });

    afterEach(() => {
        fs.removeSync(tempDir);
    });

    // ===== isServerConfigured =====
    describe("isServerConfigured", () => {
        it("-> should return false when mcp.json does not exist", () => {
            const projectDir = path.join(tempDir, 'noConfig');
            fs.ensureDirSync(projectDir);

            expect(isServerConfigured(projectDir)).toBeFalse();
        });

        it("-> should return false when pbiviz server is not present", () => {
            const projectDir = path.join(tempDir, 'otherServer');
            fs.ensureDirSync(path.join(projectDir, '.vscode'));
            fs.writeJsonSync(mcpConfigPath(projectDir), { servers: { other: {} } });

            expect(isServerConfigured(projectDir)).toBeFalse();
        });

        it("-> should return true when pbiviz server is present", () => {
            const projectDir = path.join(tempDir, 'hasServer');
            fs.ensureDirSync(path.join(projectDir, '.vscode'));
            fs.writeJsonSync(mcpConfigPath(projectDir), { servers: { [MCP_SERVER_NAME]: {} } });

            expect(isServerConfigured(projectDir)).toBeTrue();
        });

        it("-> should return false when mcp.json is corrupted", () => {
            const projectDir = path.join(tempDir, 'corrupted');
            fs.ensureDirSync(path.join(projectDir, '.vscode'));
            fs.writeFileSync(mcpConfigPath(projectDir), '{ not valid json');

            expect(isServerConfigured(projectDir)).toBeFalse();
        });
    });

    // ===== configureMcpConfig =====
    describe("configureMcpConfig", () => {
        it("-> should create mcp.json with status 'created' when none exists", () => {
            const projectDir = path.join(tempDir, 'create');
            fs.ensureDirSync(projectDir);

            const result = configureMcpConfig(projectDir);

            expect(result.status).toBe('created');
            const config = fs.readJsonSync(mcpConfigPath(projectDir));
            expect(config.servers[MCP_SERVER_NAME]).toBeDefined();
            expect(config.servers[MCP_SERVER_NAME].command).toBe('npx');
            expect(config.servers[MCP_SERVER_NAME].args).toContain('powerbi-visuals-tools');
        });

        it("-> should add to existing mcp.json with status 'added' and preserve other servers", () => {
            const projectDir = path.join(tempDir, 'merge');
            fs.ensureDirSync(path.join(projectDir, '.vscode'));
            fs.writeJsonSync(mcpConfigPath(projectDir), {
                inputs: [{ id: 'token' }],
                servers: { other: { command: 'node' } }
            });

            const result = configureMcpConfig(projectDir);

            expect(result.status).toBe('added');
            const config = fs.readJsonSync(mcpConfigPath(projectDir));
            // existing data preserved
            expect(config.inputs).toEqual([{ id: 'token' }]);
            expect(config.servers.other).toEqual({ command: 'node' });
            // our server added
            expect(config.servers[MCP_SERVER_NAME]).toBeDefined();
        });

        it("-> should not overwrite an existing pbiviz entry and report 'already-exists'", () => {
            const projectDir = path.join(tempDir, 'existing');
            fs.ensureDirSync(path.join(projectDir, '.vscode'));
            const customEntry = { command: 'custom-command', args: ['custom'] };
            fs.writeJsonSync(mcpConfigPath(projectDir), {
                servers: { [MCP_SERVER_NAME]: customEntry }
            });

            const result = configureMcpConfig(projectDir);

            expect(result.status).toBe('already-exists');
            const config = fs.readJsonSync(mcpConfigPath(projectDir));
            expect(config.servers[MCP_SERVER_NAME]).toEqual(customEntry);
        });

        it("-> should start fresh when existing mcp.json is corrupted", () => {
            const projectDir = path.join(tempDir, 'corruptedConfig');
            fs.ensureDirSync(path.join(projectDir, '.vscode'));
            fs.writeFileSync(mcpConfigPath(projectDir), '{ broken json');

            const result = configureMcpConfig(projectDir);

            expect(['created', 'added']).toContain(result.status);
            const config = fs.readJsonSync(mcpConfigPath(projectDir));
            expect(config.servers[MCP_SERVER_NAME]).toBeDefined();
        });

        it("-> should create the .vscode directory if missing", () => {
            const projectDir = path.join(tempDir, 'noVscodeDir');
            fs.ensureDirSync(projectDir);

            configureMcpConfig(projectDir);

            expect(fs.existsSync(path.join(projectDir, '.vscode'))).toBeTrue();
            expect(fs.existsSync(mcpConfigPath(projectDir))).toBeTrue();
        });

        it("-> should make isServerConfigured return true after configuring", () => {
            const projectDir = path.join(tempDir, 'roundTrip');
            fs.ensureDirSync(projectDir);

            expect(isServerConfigured(projectDir)).toBeFalse();
            configureMcpConfig(projectDir);
            expect(isServerConfigured(projectDir)).toBeTrue();
        });
    });

    describe("MCP_NEXT_STEPS", () => {
        it("-> should be a non-empty array of strings", () => {
            expect(Array.isArray(MCP_NEXT_STEPS)).toBeTrue();
            expect(MCP_NEXT_STEPS.length).toBeGreaterThan(0);
            MCP_NEXT_STEPS.forEach(line => expect(typeof line).toBe('string'));
        });
    });
});

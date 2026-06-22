/*
 *  Power BI Visual CLI - MCP Server
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 */

"use strict";

import { McpServer as MCPServerSDK } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import ConsoleWriter from "../ConsoleWriter.js";
import { getBestPractices } from "./tools/bestPractices.js";
import { checkVulnerabilities } from "./tools/vulnerabilities.js";
import { prepareCertification } from "./tools/certification.js";
import { getVisualInfo } from "./tools/visualInfo.js";
import { getAvailableApis } from "./tools/availableApis.js";

export class McpServer {
    private server: MCPServerSDK;
    private rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
        this.server = new MCPServerSDK({
            name: "pbiviz-mcp-server",
            version: "1.0.0",
        });

        this.registerTools();
    }

    private registerTools() {
        // Tool 1: Get Best Practices
        this.server.tool(
            "get_best_practices",
            "Returns best practice guidelines for Power BI custom visual development. Covers: API version management, performance optimization (update loop, lazy loading, data processing), security (eval, innerHTML, XSS, sanitization, external call/calls, network request/requests), accessibility (keyboard navigation, high contrast, screen reader, ARIA label/labels), project structure (module/modules, error handling), formatting pane (format model, formatting model), testing (unit test/tests, E2E test/tests, edge case/cases), and documentation (README, changelog, comment/comments).",
            {},
            async () => {
                const practices = await getBestPractices(this.rootPath);
                return {
                    content: [{ type: "text", text: practices }],
                };
            }
        );

        // Tool 2: Check Vulnerabilities
        this.server.tool(
            "check_vulnerabilities",
            "Scans the visual project source code for security vulnerability/vulnerabilities and dangerous code pattern/patterns. Detects: eval(), new Function(), innerHTML assignment, document.write, external fetch/HTTP call/calls, XMLHttpRequest. Also checks for commented-out dangerous code and ESLint configuration. Reports issue/issues by severity (critical, high, medium, low, info) with file path and line number.",
            {},
            async () => {
                const result = await checkVulnerabilities(this.rootPath);
                return {
                    content: [{ type: "text", text: result }],
                };
            }
        );

        // Tool 3: Prepare Certification
        this.server.tool(
            "prepare_certification",
            "Audits the visual for Power BI certification readiness. Checks: required file/files (pbiviz.json, capabilities.json, package.json, tsconfig.json), visual configuration (name, GUID, version, API version, author, support URL), capability/capabilities (data role/roles, data view mapping/mappings, keyboard focus, highlight support, web access privilege/privileges), and asset/assets (icon.png). Reports pass/fail/warning status for each check.",
            {},
            async () => {
                const result = await prepareCertification(this.rootPath);
                return {
                    content: [{ type: "text", text: result }],
                };
            }
        );

        // Tool 4: List Visual Info
        this.server.tool(
            "list_visual_info",
            "Returns detailed information about the current Power BI visual project. Shows: visual name, display name, GUID, version, API version, author, description, support URL, data role/roles, data view mapping/mappings, format object/objects (setting/settings), supported feature/features (highlight, keyboard focus, landing page, multi-visual selection), dependency/dependencies from package.json, and quick command/commands.",
            {},
            async () => {
                const result = await getVisualInfo(this.rootPath);
                return {
                    content: [{ type: "text", text: result }],
                };
            }
        );

        // Tool 5: Get Available APIs
        this.server.tool(
            "get_available_apis", 
            "Lists available Power BI Visual API/APIs and feature/features with code example/examples and documentation link/links. Categories: 'data' (fetchMoreData, data snapshot, persist property/properties), 'formatting' (color palette, format pane, formatting model, custom color/colors, high contrast), 'interaction' (selection manager, tooltip/tooltips, tooltip service, context menu, launch URL, drill down/drilldown, warning icon), 'utility' (localization, local storage, file download, rendering event/events, modal dialog, authentication), or 'all'.",
            {
                category: z.string().optional().describe("Filter APIs by category: 'data' (fetchMoreData, persist, snapshot), 'formatting' (color palette, format pane, high contrast), 'interaction' (selection, tooltip/tooltips, context menu, drill down, launch URL, warning icon), 'utility' (localization, storage, download, event/events, dialog, auth), or 'all' (default)")
            },
            async ({ category }) => {
                const result = await getAvailableApis(category || "all", this.rootPath);
                return {
                    content: [{ type: "text", text: result }],
                };
            }
        );
    }

    public async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        // Keep the server running
        process.on("SIGINT", async () => {
            await this.server.close();
            process.exit(0);
        });
    }
}

export async function startMcpServer(rootPath: string) {
    const server = new McpServer(rootPath);
    await server.start();
}

const MCP_CONFIG = {
    servers: {
        pbiviz: {
            command: "npx",
            args: ["-y", "powerbi-visuals-tools", "mcp"]
        }
    }
};

export async function initMcpConfig(rootPath: string) {
    const vscodeDir = path.join(rootPath, ".vscode");
    const mcpConfigPath = path.join(vscodeDir, "mcp.json");

    try {
        // Check if mcp.json already exists
        if (fs.existsSync(mcpConfigPath)) {
            ConsoleWriter.warning("MCP configuration already exists at .vscode/mcp.json");
            ConsoleWriter.info("To reconfigure, delete the file and run this command again.");
            return;
        }

        // Create .vscode directory if it doesn't exist
        fs.ensureDirSync(vscodeDir);

        // Write mcp.json
        fs.writeJsonSync(mcpConfigPath, MCP_CONFIG, { spaces: 4 });

        ConsoleWriter.done("MCP configuration created successfully!");
        ConsoleWriter.blank();
        ConsoleWriter.info("Created: .vscode/mcp.json");
        ConsoleWriter.blank();
        ConsoleWriter.info("Next steps:");
        ConsoleWriter.info("1. Restart VS Code to activate MCP server");
        ConsoleWriter.info("2. Open Copilot Chat and ask questions like:");
        ConsoleWriter.info('   - "Check my visual for certification readiness"');
        ConsoleWriter.info('   - "What are the best practices for Power BI visuals?"');
        ConsoleWriter.info('   - "Show me available APIs for tooltips"');
        ConsoleWriter.blank();
    } catch (error) {
        ConsoleWriter.error(`Failed to create MCP configuration: ${(error instanceof Error) ? error.message : String(error)}`);
        process.exit(1);
    }
}

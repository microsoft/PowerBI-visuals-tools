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
            "Returns best practice guidelines for Power BI custom visual development. Provides up-to-date recommendations on API usage, performance optimization, accessibility, and coding standards.",
            {},
            async () => {
                const practices = getBestPractices();
                return {
                    content: [{ type: "text", text: practices }],
                };
            }
        );

        // Tool 2: Check Vulnerabilities
        this.server.tool(
            "check_vulnerabilities",
            "Scans the visual project for known security vulnerabilities in dependencies and code patterns. Analyzes package.json and common security anti-patterns.",
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
            "Audits the visual for Power BI certification readiness. Checks for required files, proper API usage, no external connections, and other certification requirements.",
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
            "Returns detailed information about the current visual including name, GUID, API version, capabilities, data roles, and supported features from pbiviz.json and capabilities.json.",
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
            "Lists available Power BI Visuals APIs and features that can be added to the visual, with examples and documentation links.",
            {
                category: z.string().optional().describe("Filter APIs by category: 'data', 'formatting', 'interaction', 'utility', or 'all'")
            },
            async ({ category }) => {
                const result = getAvailableApis(category || "all");
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
            args: ["pbiviz", "mcp"]
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
        ConsoleWriter.error(`Failed to create MCP configuration: ${error.message}`);
        process.exit(1);
    }
}

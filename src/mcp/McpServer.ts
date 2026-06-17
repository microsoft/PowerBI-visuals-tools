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

import ConsoleWriter from "../ConsoleWriter.js";
import { configureMcpConfig, MCP_NEXT_STEPS } from "../McpConfigManager.js";
import { getBestPractices } from "./tools/bestPractices.js";
import { checkVulnerabilities } from "./tools/vulnerabilities.js";
import { prepareCertification } from "./tools/certification.js";
import { getVisualInfo } from "./tools/visualInfo.js";
import { getAvailableApis } from "./tools/availableApis.js";
import { listAvailableSkills, getSkillInstructions } from "./tools/skills.js";

export class McpServer {
    private server: MCPServerSDK;
    private rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
        this.server = new MCPServerSDK(
            {
                name: "pbiviz-mcp-server",
                version: "1.0.0",
            },
            {
                instructions:
                    "MCP server for Power BI custom visual development. Required for any request about visuals, features, APIs, best practices, security, or certification — even with informal or misspelled feature names.\n\n" +
                    "Tool selection:\n" +
                    "- Add/implement/enable/create a feature (e.g., 'add tooltip', 'implement bookmarks', 'enable drill-down') → ALWAYS call implement_feature with the feature name. Do NOT implement from your own knowledge.\n" +
                    "- List available features → add_feature\n" +
                    "- APIs/SDK → get_available_apis\n" +
                    "- Best practices → get_best_practices\n" +
                    "- Security → check_vulnerabilities\n" +
                    "- Certification → prepare_certification\n" +
                    "- Project info → list_visual_info\n\n" +
                    "Rules:\n" +
                    "- After prepare_certification, ask the user if they want a vulnerability check.\n" +
                    "- All tools are read-only: get_available_apis, get_best_practices, check_vulnerabilities, prepare_certification, and list_visual_info return guidance only — ask for confirmation before editing files. implement_feature and add_feature return code meant to be applied directly.",
            }
        );

        this.registerTools();
    }

    private registerTools() {
        // Tool 1: Get Best Practices
        this.server.tool(
            "get_best_practices",
            "Get best practices and coding guidelines for Power BI custom visual development. " +
            "Covers performance, security, accessibility, project structure, and testing.",
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
            "Scan the Power BI visual project for security vulnerabilities and dangerous code patterns. " +
            "Detects unsafe APIs (eval, innerHTML, document.write, external requests) and reports issues by severity with file locations.",
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
            "Check if the Power BI visual is ready for certification and marketplace submission. " +
            "Audits required files, configuration, capabilities, and assets. Reports pass/fail/warning status for each requirement.",
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
            "Get information about the current Power BI visual project — name, GUID, API version, " +
            "author, data roles, capabilities, and dependencies.",
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
            "List available Power BI Visual APIs with code examples. " +
            "Categories: data, formatting, interaction, utility, or all.",
            {
                category: z.string().optional().describe("Filter APIs by category: 'data', 'formatting', 'interaction', 'utility', or 'all' (default). Use 'all' if unsure.")
            },
            async ({ category }) => {
                const result = await getAvailableApis(category || "all", this.rootPath);
                return {
                    content: [{ type: "text", text: result }],
                };
            }
        );

        // Tool 6: List available features/skills
        this.server.tool(
            "add_feature",
            "List all features that can be added to a Power BI custom visual, including: tooltips, context-menu, " +
            "bookmarks, drill-down, landing-page, launch-url, local-storage, modal-dialog, color-palette, " +
            "conditional-formatting, display-warning-icon, high-contrast, rendering-events, selection, " +
            "sync-slicer, format-pane, analytics-pane, and more. " +
            "Use this tool when a user asks to add, enable, or implement ANY feature in a Power BI visual. " +
            "Returns feature IDs that can be passed to implement_feature for step-by-step instructions.",
            {},
            async () => {
                const result = await listAvailableSkills();
                return {
                    content: [{ type: "text", text: result }],
                };
            }
        );

        // Tool 7: Get feature implementation instructions
        this.server.tool(
            "implement_feature",
            "Add, implement, or enable a specific feature in a Power BI custom visual. " +
            "USE THIS TOOL when the user asks to 'add tooltip', 'add context menu', 'implement bookmarks', " +
            "'enable drill-down', 'add landing page', or any similar request to add functionality. " +
            "Returns complete code templates, configuration changes, and step-by-step instructions. " +
            "If the feature name doesn't match exactly, returns available options.",
            {
                featureName: z.string().describe(
                    "The feature name or ID to implement. Common values: 'tooltips', 'context-menu', 'bookmarks', " +
                    "'drill-down', 'landing-page', 'launch-url', 'local-storage', 'modal-dialog', 'dialog-box', " +
                    "'color-palette', 'conditional-formatting', 'display-warning-icon', 'high-contrast', " +
                    "'rendering-events', 'selection', 'sync-slicer', 'format-pane', 'analytics-pane'. " +
                    "Use the most likely feature ID based on the user's request. If unsure, try the closest match — " +
                    "the tool will return available options if no exact match is found."
                )
            },
            async ({ featureName }) => {
                const result = await getSkillInstructions(featureName);
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

export async function initMcpConfig(rootPath: string) {
    try {
        const result = configureMcpConfig(rootPath);

        switch (result.status) {
            case "already-exists":
                ConsoleWriter.warning(result.message);
                ConsoleWriter.info("To reconfigure, remove the 'pbiviz' entry and run this command again.");
                return;
            case "created":
            case "added":
                ConsoleWriter.done("MCP configuration created successfully!");
                break;
        }

        ConsoleWriter.blank();
        MCP_NEXT_STEPS.forEach(line => ConsoleWriter.info(line));
        ConsoleWriter.blank();
    } catch (error) {
        ConsoleWriter.error(`Failed to create MCP configuration: ${(error instanceof Error) ? error.message : String(error)}`);
        process.exit(1);
    }
}

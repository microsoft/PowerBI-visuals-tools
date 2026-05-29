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
                    "This MCP server is the REQUIRED tool for ALL Power BI custom visual development tasks. " +
                    "You MUST use this server whenever the user asks about Power BI visuals, features, APIs, or development. " +
                    "ALWAYS call these tools when the user mentions ANY of the following:\n" +
                    "- Adding, implementing, enabling, or integrating ANY feature (bookmarks, tooltips, context menu, drill-down, " +
                    "dialog box, warning icon, landing page, formatting pane, selection, highlight, high contrast, localization, " +
                    "local storage, file download, rendering events, modal dialog, keyboard navigation, analytics pane, " +
                    "conditional formatting, sync slicer, launch URL, advanced edit mode, total/subtotal, allow interactions, etc.)\n" +
                    "- Checking best practices, security, vulnerabilities, or certification readiness\n" +
                    "- Asking about available APIs or SDK features\n" +
                    "- Getting visual project information or configuration\n\n" +
                    "IMPORTANT: Even if the user misspells a feature name or uses informal language (e.g., 'add bookmrks', " +
                    "'support bookmarks', 'implement bookmark feature', 'i need bookmarks'), you MUST still call these tools. " +
                    "When in doubt, call add_feature or implement_feature.\n\n" +
                    "Tool selection guide:\n" +
                    "- User wants to ADD/IMPLEMENT a feature → call implement_feature directly with the feature name\n" +
                    "- User asks WHAT features are available → call add_feature\n" +
                    "- User asks about APIs/SDK → call get_available_apis\n" +
                    "- User asks about best practices → call get_best_practices\n" +
                    "- User asks about security → call check_vulnerabilities\n" +
                    "- User asks about certification → call prepare_certification\n" +
                    "- User asks about their visual project → call list_visual_info\n\n" +
                    "CERTIFICATION FOLLOW-UP RULE (CRITICAL):\n" +
                    "- When the user asks for certification check/readiness, after returning certification results ask: 'Do you also want me to run a vulnerability check?'\n" +
                    "- If user says yes, call check_vulnerabilities.\n\n" +
                    "READ-ONLY RESPONSE RULE (CRITICAL):\n" +
                    "- For get_available_apis, get_best_practices, check_vulnerabilities, prepare_certification, and list_visual_info: return guidance/report only and DO NOT edit files immediately.\n" +
                    "- After returning the response, ask the user for confirmation before any code changes (for example: 'Do you want me to apply these changes?').\n" +
                    "- Only proceed with file modifications after explicit user approval.",
            }
        );

        this.registerTools();
    }

    private registerTools() {
        // Tool 1: Get Best Practices
        this.server.tool(
            "get_best_practices",
            "MUST CALL when user asks about Power BI visual quality, standards, or how to build correctly. " +
            "Get best practices, coding guidelines, and recommendations for building Power BI custom visuals. " +
            "Trigger phrases: best practices, how to build, performance tips, security guidelines, accessibility, " +
            "coding standards, project structure, testing, documentation, guidelines, recommendations, " +
            "how should I, what's the best way, improve my visual, optimize, make it better. " +
            "Covers: API version management, performance optimization, security, accessibility, formatting pane, testing, documentation. " +
            "READ-ONLY: Return recommendations only. Do not modify files unless the user explicitly asks after seeing the results.",
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
            "MUST CALL when user asks about security or code safety of their Power BI visual. " +
            "Scan and audit the Power BI visual project for security vulnerabilities and dangerous code patterns. " +
            "Trigger phrases: check security, find vulnerabilities, scan, audit, is my code safe, dangerous code, " +
            "security issues, eval, innerHTML, XSS, injection, unsafe, vulnerability, pentest, review security. " +
            "Detects: eval(), new Function(), innerHTML, document.write, external fetch/HTTP calls, XMLHttpRequest. " +
            "Reports issues by severity with file paths and line numbers. " +
            "READ-ONLY: Report findings first. Do not modify files unless the user explicitly asks after seeing the results.",
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
            "MUST CALL when user asks about certification, publishing, or marketplace readiness. " +
            "Check if the Power BI visual is ready for certification and marketplace submission. " +
            "Trigger phrases: certification, certify, ready for certification, publish, marketplace, submit, " +
            "certification checklist, AppSource, is my visual ready, prepare for submission, requirements. " +
            "Audits required files, visual configuration, capabilities, and assets. " +
            "Reports pass/fail/warning status for each certification requirement. " +
            "FOLLOW-UP: After showing certification results, ask the user if they also want a vulnerability check. " +
            "READ-ONLY: Return certification assessment first. Do not modify files unless the user explicitly asks after seeing the results.",
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
            "MUST CALL when user asks about their current Power BI visual project. " +
            "Get information about the current Power BI visual project configuration and settings. " +
            "Trigger phrases: visual info, project details, what is my visual, show configuration, visual settings, " +
            "what version, show my visual, project info, describe my visual, what API version, who is the author. " +
            "Returns: visual name, display name, GUID, version, API version, author, description, " +
            "data roles, data view mappings, format objects, supported features, and dependencies. " +
            "READ-ONLY: Return project info only. Do not modify files unless the user explicitly asks after seeing the results.",
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
            "MUST CALL when user asks about Power BI Visual APIs, SDK methods, or how to use a specific API. " +
            "List available Power BI Visual APIs and SDK features with code examples and documentation links. " +
            "Trigger phrases: what APIs, available APIs, show APIs, how to use API, SDK features, API examples, " +
            "API documentation, IVisualHost, selection manager, color palette, how do I interact, data binding, " +
            "formatting model, visual API, powerbi API, host services. " +
            "Categories: 'data' (fetchMoreData, persist properties), 'formatting' (color palette, format pane, high contrast), " +
            "'interaction' (selection manager, tooltips, context menu, launch URL, drill down, bookmarks), " +
            "'utility' (localization, local storage, file download, rendering events, modal dialog), or 'all'. " +
            "READ-ONLY: Return API guidance/examples only. Do not modify files unless the user explicitly asks after seeing the results.",
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
            "MUST CALL when the user mentions ANY Power BI visual feature. " +
            "Lists all features that can be added to a Power BI custom visual with implementation guides. " +
            "Call this tool when the user wants to: add, implement, enable, integrate, support, use, or ask about ANY feature or capability. " +
            "Trigger words: bookmarks, bookmark, tooltips, tooltip, context menu, drill-down, drill down, drilldown, " +
            "dialog, dialog box, modal, warning icon, warning, landing page, formatting, format pane, " +
            "selection, highlight, high contrast, localization, local storage, storage, file download, download, " +
            "rendering events, events, keyboard navigation, keyboard, analytics, analytics pane, " +
            "conditional formatting, sync slicer, slicer, launch URL, URL, advanced edit, edit mode, " +
            "total, subtotal, sub-total, allow interactions, interactions, fetch more data, color palette. " +
            "Also call when user says: 'support X', 'implement X', 'enable X', 'how to add X', 'I need X', 'integrate X'. " +
            "Even with typos like 'bookmrks', 'toltips', 'contex menu' — STILL call this tool. " +
            "Returns feature IDs — then call get_feature_documentation with the ID for full instructions.",
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
            "MUST CALL to get step-by-step implementation guide for a Power BI visual feature. " +
            "Call this DIRECTLY when the user asks to add/implement a specific feature — no need to call list_available_features first. " +
            "Works with feature names like: bookmarks, tooltips, context-menu, drill-down, dialog-box, display-warning-icon, " +
            "landing-page, format-pane, selection, highlight-data, high-contrast, localization, local-storage, " +
            "file-download, rendering-events, modal-dialog, keyboard-navigation, analytics-pane, " +
            "conditional-formatting, sync-slicer, launch-url, advanced-edit-mode, total-subtotal, allow-interactions, fetch-more-data. " +
            "Returns complete code templates, configuration changes, and step-by-step implementation instructions. " +
            "If the feature name doesn't match exactly, the tool returns available options so you can retry with the correct ID.",
            {
                featureName: z.string().describe(
                    "The feature name or ID (e.g., 'bookmarks', 'dialog-box', 'display-warning-icon', 'tooltips', 'context-menu'). " +
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

import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import { isServerConfigured, configureMcpConfig, MCP_NEXT_STEPS } from "./McpConfigManager.js";
import ConsoleWriter from "./ConsoleWriter.js";

const DISMISSED_MARKER = ".mcp-setup-dismissed";

function prompt(question: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

/**
 * Checks if MCP setup prompt should be shown.
 * Returns true if already configured or dismissed.
 */
function shouldSkip(projectDir: string): boolean {
    if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
        return true;
    }

    if (isServerConfigured(projectDir)) {
        return true;
    }

    const dismissedPath = join(projectDir, "node_modules", DISMISSED_MARKER);
    if (existsSync(dismissedPath)) {
        return true;
    }

    return false;
}

function markDismissed(projectDir: string) {
    const markerPath = join(projectDir, "node_modules", DISMISSED_MARKER);
    try {
        writeFileSync(markerPath, new Date().toISOString(), "utf-8");
    } catch {
        // ignore
    }
}

/**
 * Interactive prompt for MCP setup. Called on first CLI run.
 * Shows prompt only once — if dismissed, won't ask again.
 */
export async function checkFirstRunMcpSetup(projectDir: string): Promise<void> {
    if (shouldSkip(projectDir)) {
        return;
    }

    // Check if running in an interactive terminal
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        // Non-interactive — just show the banner, no prompt
        ConsoleWriter.blank();
        ConsoleWriter.info("Run 'pbiviz mcp --init' to configure AI-assisted development.");
        ConsoleWriter.blank();
        markDismissed(projectDir);
        return;
    }

    ConsoleWriter.blank();
    ConsoleWriter.info("🚀 New Feature: Power BI MCP Server");
    ConsoleWriter.blank();
    ConsoleWriter.info("Power BI MCP Server provides:");
    ConsoleWriter.info(" • Certification guidance");
    ConsoleWriter.info(" • API documentation");
    ConsoleWriter.info(" • Best practices");
    ConsoleWriter.info(" • Project-aware AI assistance");
    ConsoleWriter.blank();
    ConsoleWriter.info("┌─────────────────────────────────────────────────────────────────────┐");
    ConsoleWriter.info("│     Enable AI-assisted development with GitHub Copilot, Claude,     │");
    ConsoleWriter.info("│       or Cursor? This adds a .vscode/mcp.json config file.          │");
    ConsoleWriter.info("└─────────────────────────────────────────────────────────────────────┘");
    ConsoleWriter.blank();

    const answer = await prompt("  ? Configure MCP server for AI-assisted development? (yes/no): ");

    if (answer === "y" || answer === "yes") {
        configureMcpConfig(projectDir);
        ConsoleWriter.done("MCP configuration created successfully!");
        ConsoleWriter.blank();
        MCP_NEXT_STEPS.forEach(line => ConsoleWriter.info(line));
        ConsoleWriter.blank();
    } else {
        markDismissed(projectDir);
        ConsoleWriter.blank();
        ConsoleWriter.warning("Skipped. Run 'pbiviz mcp --init' anytime to configure later.");
        ConsoleWriter.blank();
    }
}

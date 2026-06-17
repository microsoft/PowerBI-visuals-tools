import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

export const MCP_SERVER_NAME = "pbiviz";

const MCP_SERVER_ENTRY = {
    command: "npx",
    args: ["-y", "powerbi-visuals-tools", "mcp"]
};

export interface ConfigureResult {
    status: "created" | "added" | "already-exists";
    message: string;
}

/**
 * Checks if our MCP server is already present in the config file.
 */
export function isServerConfigured(projectDir: string): boolean {
    const mcpConfigPath = join(projectDir, ".vscode", "mcp.json");
    if (!existsSync(mcpConfigPath)) {
        return false;
    }
    try {
        const existing = JSON.parse(readFileSync(mcpConfigPath, "utf-8"));
        return !!(existing?.servers?.[MCP_SERVER_NAME]);
    } catch {
        return false;
    }
}

/**
 * Adds the MCP server entry to .vscode/mcp.json.
 * If the file already exists, merges into it preserving ALL existing content:
 * - Other servers are never touched
 * - Top-level keys (inputs, etc.) are preserved
 * - If the server already exists (even if user-modified), it is NOT overwritten
 */
export function configureMcpConfig(projectDir: string): ConfigureResult {
    const vscodeDir = join(projectDir, ".vscode");
    const mcpConfigPath = join(vscodeDir, "mcp.json");

    if (!existsSync(vscodeDir)) {
        mkdirSync(vscodeDir, { recursive: true });
    }

    let config: Record<string, unknown> = { servers: {} };
    const fileExisted = existsSync(mcpConfigPath);

    if (fileExisted) {
        try {
            const existing = JSON.parse(readFileSync(mcpConfigPath, "utf-8"));
            if (existing && typeof existing === "object") {
                config = existing;
                if (!config.servers || typeof config.servers !== "object") {
                    config.servers = {};
                }
            }
        } catch {
            // Corrupted JSON — start fresh
            config = { servers: {} };
        }
    }

    const servers = config.servers as Record<string, unknown>;

    // Never overwrite an existing entry — user may have customized it
    if (servers[MCP_SERVER_NAME]) {
        return {
            status: "already-exists",
            message: `MCP server '${MCP_SERVER_NAME}' is already configured in .vscode/mcp.json`
        };
    }

    servers[MCP_SERVER_NAME] = MCP_SERVER_ENTRY;
    writeFileSync(mcpConfigPath, JSON.stringify(config, null, 4), "utf-8");

    return {
        status: fileExisted ? "added" : "created",
        message: fileExisted
            ? `Added '${MCP_SERVER_NAME}' to existing .vscode/mcp.json`
            : "Created .vscode/mcp.json"
    };
}

export const MCP_NEXT_STEPS = [
    "Next steps:",
    "1. Restart VS Code to activate MCP server",
    "2. Open Copilot Chat and ask questions like:",
    '   - "Check my visual for certification readiness"',
    '   - "What are the best practices for Power BI visuals?"',
    '   - "Show me available APIs for tooltips"',
];

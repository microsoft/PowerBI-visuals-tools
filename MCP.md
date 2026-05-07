# Power BI Visuals Tools - MCP Server

This document describes the MCP (Model Context Protocol) server integration for Power BI Custom Visual Tools, inspired by the Angular 21 MCP implementation.

## What is MCP?

Model Context Protocol (MCP) is an open protocol that allows AI assistants (like GitHub Copilot, Cursor, Claude) to interact with development tools directly. The MCP server exposes "tools" that AI can call to get context-aware information about your project.

## Quick Start

### Option 1: Using VS Code with Copilot

1. Add this to your VS Code settings or create `.vscode/mcp.json`:

```json
{
    "servers": {
        "pbiviz": {
            "command": "npx",
            "args": ["-y", "powerbi-visuals-tools", "mcp"]
        }
    }
}
```

2. Restart VS Code
3. In Copilot Chat, you can now ask questions like:
   - "Check my visual for certification readiness"
   - "What are the best practices for Power BI visuals?"
   - "Show me available Power BI Visual APIs"

### Option 2: Using Cursor

Add to Cursor settings (`~/.cursor/mcp.json`):

```json
{
    "mcpServers": {
        "pbiviz": {
            "command": "npx",
            "args": ["-y", "powerbi-visuals-tools", "mcp"]
        }
    }
}
```

### Option 3: Run Manually (for testing)

```bash
cd /path/to/your/visual-project
pbiviz mcp
```

The server runs on STDIO, so you won't see output, but it will respond to MCP requests.

## Available Tools

| Tool | Description | Local | Read-only |
|------|-------------|-------|-----------|
| `get_best_practices` | Returns best practice guidelines for Power BI visual development | ✅ | ✅ |
| `check_vulnerabilities` | Scans project for security vulnerabilities in dependencies and code | ✅ | ✅ |
| `prepare_certification` | Audits visual for Power BI certification readiness | ✅ | ✅ |
| `list_visual_info` | Returns info about current visual (name, GUID, API version, capabilities) | ✅ | ✅ |
| `get_available_apis` | Lists available Power BI Visual APIs with examples | ✅ | ✅ |

### Tool Details

#### `get_best_practices`

Returns comprehensive guidelines including:
- API version management
- Performance optimization tips
- Security guidelines
- Accessibility requirements
- Project structure recommendations
- Testing best practices

#### `check_vulnerabilities`

Analyzes:
- `package.json` dependencies for known vulnerable packages
- Source code for dangerous patterns (`eval()`, `innerHTML`, external fetch calls)
- Returns severity-categorized results (critical/high/medium/low/info)

#### `prepare_certification`

Checks:
- Required files (pbiviz.json, capabilities.json, package.json)
- Visual configuration (name, GUID, version format, API version)
- Capabilities (data roles, accessibility support)
- Assets (icon.png)

#### `list_visual_info`

Extracts from project files:
- Visual name, display name, GUID
- Version and API version
- Author information
- Defined data roles and format objects
- Supported features (highlight, keyboard focus, etc.)
- Dependencies list

#### `get_available_apis`

Provides documentation for:
- **Data APIs**: fetchMoreData, persistProperties
- **Formatting APIs**: colorPalette, getFormattingModel, high contrast
- **Interaction APIs**: selectionManager, tooltipService, contextMenu, drilldown
- **Utility APIs**: localization, storage, events, modal dialog

Accepts optional `category` parameter: `data`, `formatting`, `interaction`, `utility`, or `all`.

## Example Interactions

### With GitHub Copilot (Agent Mode)

**You:** "Is my visual ready for certification?"

**Copilot:** *calls `prepare_certification` tool*

> Based on the certification check, your visual has:
> - ✅ 12 passed checks
> - ⚠️ 2 warnings: Missing keyboard focus support, no README.md
> - ❌ 1 failed: API version 2.6.0 is outdated
> 
> Recommendation: Update to API version 5.x and add `"supportsKeyboardFocus": true` to capabilities.json.

---

**You:** "What APIs can I use for tooltips and selection?"

**Copilot:** *calls `get_available_apis` with category="interaction"*

> For tooltips, use `host.tooltipService.show()`:
> ```typescript
> host.tooltipService.show({
>     dataItems: tooltipData,
>     coordinates: [x, y]
> });
> ```
> For selection, use `selectionManager`:
> ```typescript
> const selectionManager = host.createSelectionManager();
> selectionManager.select(selectionId);
> ```

## How It Works

```
┌─────────────────┐     STDIO      ┌─────────────────┐
│   VS Code /     │ ◄───────────►  │   pbiviz mcp    │
│   Copilot       │    (MCP)       │   (MCP Server)  │
└─────────────────┘                └─────────────────┘
                                          │
                                          ▼
                                   ┌─────────────────┐
                                   │  Visual Project │
                                   │  - pbiviz.json  │
                                   │  - capabilities │
                                   │  - package.json │
                                   │  - src/         │
                                   └─────────────────┘
```

1. VS Code starts `pbiviz mcp` as a subprocess
2. Copilot sends `ListTools` request → pbiviz returns available tools
3. When you ask a question, Copilot may call a tool
4. pbiviz executes the tool (reads project files, runs checks)
5. Results are returned to Copilot as structured text
6. Copilot presents the information in a helpful way

## Development

### Building from Source

```bash
git clone https://github.com/Microsoft/PowerBI-visuals-tools.git
cd PowerBI-visuals-tools
npm install
npm run build
```

### Testing MCP Server Locally

```bash
# In your visual project directory:
node /path/to/PowerBI-visuals-tools/bin/pbiviz.js mcp
```

### Adding New Tools

1. Create a new file in `src/mcp/tools/`
2. Export a function that returns a string result
3. Register the tool in `src/mcp/McpServer.ts`

Example:
```typescript
// src/mcp/tools/myTool.ts
export function myTool(rootPath: string): string {
    // Read files, perform checks, return markdown result
    return "# My Tool Result\n...";
}

// In McpServer.ts
this.server.tool(
    "my_tool",
    "Description for AI",
    {},
    async () => ({
        content: [{ type: "text", text: myTool(this.rootPath) }]
    })
);
```

## Comparison with Angular 21 MCP

| Feature | Angular CLI | pbiviz (this implementation) |
|---------|-------------|------------------------------|
| Best practices | `get_best_practices` | `get_best_practices` |
| Project info | `list_projects` | `list_visual_info` |
| Code examples | `find_examples` | `get_available_apis` |
| Documentation search | `search_documentation` (online) | ❌ (offline only) |
| Migration tools | `onpush_zoneless_migration` | `prepare_certification` |
| Build/Run | `build`, `serve` | Use regular CLI commands |

## Requirements

- Node.js >= 18.0.0
- VS Code with GitHub Copilot (for Chat integration)
- Or Cursor / other MCP-compatible AI assistant

## License

MIT - Microsoft Corporation

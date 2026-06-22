/*
 *  Power BI Visual CLI - MCP Server - Visual Info Tool
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 */

"use strict";

import fs from 'fs-extra';
import path from 'path';

interface VisualInfo {
    name: string;
    displayName: string;
    guid: string;
    version: string;
    apiVersion: string;
    author: {
        name: string;
        email: string;
    };
    description?: string;
    supportUrl?: string;
    capabilities: {
        dataRoles: string[];
        dataViewMappings: string[];
        objects: string[];
        supportsHighlight: boolean;
        supportsKeyboardFocus: boolean;
        supportsLandingPage: boolean;
        supportsMultiVisualSelection: boolean;
    };
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

async function loadJsonSafe(filePath: string): Promise<any | null> {
    try {
        if (fs.existsSync(filePath)) {
            return await fs.readJson(filePath);
        }
    } catch {
        return null;
    }
    return null;
}

export async function getVisualInfo(rootPath: string): Promise<string> {
    try {
        const pbivizPath = path.join(rootPath, 'pbiviz.json');
        const capabilitiesPath = path.join(rootPath, 'capabilities.json');
        const packageJsonPath = path.join(rootPath, 'package.json');

        const pbiviz = await loadJsonSafe(pbivizPath);
        const capabilities = await loadJsonSafe(capabilitiesPath);
        const packageJson = await loadJsonSafe(packageJsonPath);

        if (!pbiviz) {
            return `❌ **Not a Power BI Visual Project**

No pbiviz.json found in: ${rootPath}

To create a new visual, run:
\`\`\`
pbiviz new <visual-name>
\`\`\`
`;
        }

        const info: VisualInfo = {
            name: pbiviz.visual?.name || 'Unknown',
            displayName: pbiviz.visual?.displayName || 'Unknown',
            guid: pbiviz.visual?.guid || 'Not set',
            version: pbiviz.visual?.version || '0.0.0',
            apiVersion: pbiviz.apiVersion || 'Not specified',
            author: {
                name: pbiviz.author?.name || 'Not specified',
                email: pbiviz.author?.email || 'Not specified'
            },
            description: pbiviz.visual?.description,
            supportUrl: pbiviz.visual?.supportUrl,
            capabilities: {
                dataRoles: capabilities?.dataRoles?.map(r => r.name) || [],
                dataViewMappings: capabilities?.dataViewMappings?.map((_, i) => `Mapping ${i + 1}`) || [],
                objects: capabilities?.objects ? Object.keys(capabilities.objects) : [],
                supportsHighlight: capabilities?.supportsHighlight || false,
                supportsKeyboardFocus: capabilities?.supportsKeyboardFocus || false,
                supportsLandingPage: capabilities?.supportsLandingPage || false,
                supportsMultiVisualSelection: capabilities?.supportsMultiVisualSelection || false,
            },
            dependencies: packageJson?.dependencies,
            devDependencies: packageJson?.devDependencies
        };

        return formatVisualInfo(info);
    } catch (error) {
        return `❌ Error reading visual info: ${(error instanceof Error) ? error.message : String(error)}`;
    }
}

function formatVisualInfo(info: VisualInfo): string {
    let output = `# 📊 Power BI Visual Information\n\n`;

    // Basic Info
    output += `## 🔷 Visual Details\n\n`;
    output += `| Property | Value |\n|----------|-------|\n`;
    output += `| **Name** | ${info.name} |\n`;
    output += `| **Display Name** | ${info.displayName} |\n`;
    output += `| **GUID** | \`${info.guid}\` |\n`;
    output += `| **Version** | ${info.version} |\n`;
    output += `| **API Version** | ${info.apiVersion} |\n`;
    if (info.description) {
        output += `| **Description** | ${info.description} |\n`;
    }
    if (info.supportUrl) {
        output += `| **Support URL** | ${info.supportUrl} |\n`;
    }
    output += '\n';

    // Author
    output += `## 👤 Author\n\n`;
    output += `- **Name**: ${info.author.name}\n`;
    output += `- **Email**: ${info.author.email}\n\n`;

    // Capabilities
    output += `## ⚙️ Capabilities\n\n`;

    if (info.capabilities.dataRoles.length > 0) {
        output += `### Data Roles\n`;
        info.capabilities.dataRoles.forEach(role => {
            output += `- \`${role}\`\n`;
        });
        output += '\n';
    }

    if (info.capabilities.objects.length > 0) {
        output += `### Format Objects (Settings)\n`;
        info.capabilities.objects.forEach(obj => {
            output += `- \`${obj}\`\n`;
        });
        output += '\n';
    }

    output += `### Supported Features\n`;
    output += `| Feature | Enabled |\n|---------|--------|\n`;
    output += `| Highlight | ${info.capabilities.supportsHighlight ? '✅' : '❌'} |\n`;
    output += `| Keyboard Focus | ${info.capabilities.supportsKeyboardFocus ? '✅' : '❌'} |\n`;
    output += `| Landing Page | ${info.capabilities.supportsLandingPage ? '✅' : '❌'} |\n`;
    output += `| Multi-Visual Selection | ${info.capabilities.supportsMultiVisualSelection ? '✅' : '❌'} |\n`;
    output += '\n';

    // Dependencies
    if (info.dependencies && Object.keys(info.dependencies).length > 0) {
        output += `## 📦 Dependencies\n\n`;
        output += `| Package | Version |\n|---------|--------|\n`;
        for (const [pkg, version] of Object.entries(info.dependencies)) {
            output += `| ${pkg} | ${version} |\n`;
        }
        output += '\n';
    }

    // Quick Commands
    output += `## 🚀 Quick Commands\n\n`;
    output += `\`\`\`bash\n`;
    output += `# Start development server\npbiviz start\n\n`;
    output += `# Build package\npbiviz package\n\n`;
    output += `# Run linting\npbiviz lint\n\n`;
    output += `# Check certification readiness\npbiviz package --certification-audit\n`;
    output += `\`\`\`\n`;

    return output;
}

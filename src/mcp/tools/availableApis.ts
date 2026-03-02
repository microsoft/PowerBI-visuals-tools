/*
 *  Power BI Visual CLI - MCP Server - Available APIs Tool
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 */

"use strict";

interface ApiInfo {
    name: string;
    category: 'data' | 'formatting' | 'interaction' | 'utility';
    description: string;
    minApiVersion: string;
    example?: string;
    docsUrl?: string;
}

const AVAILABLE_APIS: ApiInfo[] = [
    // Data APIs
    {
        name: 'fetchMoreData',
        category: 'data',
        description: 'Enables loading additional data in chunks. Essential for large datasets that exceed the initial row limit.',
        minApiVersion: '2.6.0',
        example: `// In update method
if (options.dataViews[0].metadata.segment) {
    host.fetchMoreData();
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/fetch-more-data'
    },
    {
        name: 'getDataViewSnapshot',
        category: 'data',
        description: 'Gets a snapshot of the current DataView for async processing.',
        minApiVersion: '5.1.0'
    },
    {
        name: 'persistProperties',
        category: 'data',
        description: 'Allows visual to save properties that persist across sessions.',
        minApiVersion: '1.3.0',
        example: `host.persistProperties({
    replace: [{
        objectName: "settings",
        selector: null,
        properties: { myProperty: value }
    }]
});`
    },

    // Formatting APIs  
    {
        name: 'colorPalette',
        category: 'formatting',
        description: 'Access the Power BI color palette for consistent theming.',
        minApiVersion: '2.1.0',
        example: `const colors = host.colorPalette;
const color = colors.getColor("category1").value;`
    },
    {
        name: 'getFormattingModel',
        category: 'formatting',
        description: 'Modern formatting pane API. Returns formatting cards and groups for the Format pane.',
        minApiVersion: '5.1.0',
        example: `public getFormattingModel(): FormattingModel {
    return {
        cards: [{
            displayName: "My Settings",
            groups: [...]
        }]
    };
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/format-pane'
    },
    {
        name: 'applyCustomColor',
        category: 'formatting',
        description: 'Apply custom colors that override theme colors.',
        minApiVersion: '3.8.0'
    },
    {
        name: 'isHighContrastModeSupported',
        category: 'formatting',
        description: 'Detect and support Windows High Contrast mode for accessibility.',
        minApiVersion: '2.6.0',
        example: `if (host.hostCapabilities.allowHighContrast) {
    // Apply high contrast styling
}`
    },

    // Interaction APIs
    {
        name: 'selectionManager',
        category: 'interaction',
        description: 'Handle data point selection and cross-filtering with other visuals.',
        minApiVersion: '1.0.0',
        example: `const selectionManager = host.createSelectionManager();
// On click:
selectionManager.select(selectionId);`
    },
    {
        name: 'tooltipService',
        category: 'interaction',
        description: 'Show rich tooltips on hover with data details.',
        minApiVersion: '1.7.0',
        example: `host.tooltipService.show({
    dataItems: tooltipData,
    coordinates: [x, y],
    isTouchEvent: false
});`
    },
    {
        name: 'contextMenuService',
        category: 'interaction',
        description: 'Show Power BI context menu on right-click (drill, filter, etc.).',
        minApiVersion: '2.5.0',
        example: `host.contextMenuService.show({
    dataItems: contextMenuData,
    position: { x, y }
});`
    },
    {
        name: 'launchUrl',
        category: 'interaction',
        description: 'Open external URLs in a new browser tab.',
        minApiVersion: '1.7.0',
        example: `host.launchUrl("https://example.com");`
    },
    {
        name: 'drilldown',
        category: 'interaction',
        description: 'Enable drill-down functionality for hierarchical data.',
        minApiVersion: '2.0.0',
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/drill-down-support'
    },
    {
        name: 'displayWarningIcon',
        category: 'interaction',
        description: 'Show warning icon in visual header with custom message.',
        minApiVersion: '4.0.0',
        example: `host.displayWarningIcon("Data may be incomplete", "Some rows were filtered");`
    },

    // Utility APIs
    {
        name: 'createLocalizationManager',
        category: 'utility',
        description: 'Support multiple languages with string localization.',
        minApiVersion: '2.3.0',
        example: `const locManager = host.createLocalizationManager();
const text = locManager.getDisplayName("myKey");`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/localization'
    },
    {
        name: 'storageService',
        category: 'utility',
        description: 'Store data locally (up to 1MB) that persists across sessions.',
        minApiVersion: '2.1.0',
        example: `await host.storageService.set("myKey", "myValue");
const value = await host.storageService.get("myKey");`
    },
    {
        name: 'downloadService',
        category: 'utility',
        description: 'Trigger file download from the visual (e.g., export to CSV).',
        minApiVersion: '3.8.0',
        example: `host.downloadService.exportVisualsContent(
    csvContent,
    "data.csv",
    "text/csv"
);`
    },
    {
        name: 'eventService',
        category: 'utility',
        description: 'Report rendering events (started, finished, failed) for performance tracking.',
        minApiVersion: '2.7.0',
        example: `host.eventService.renderingStarted(options);
// ... rendering logic
host.eventService.renderingFinished(options);`
    },
    {
        name: 'modalDialog',
        category: 'utility',
        description: 'Open a modal dialog for extended UI (e.g., configuration wizards).',
        minApiVersion: '4.5.0',
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/create-display-dialog-box'
    },
    {
        name: 'authentication',
        category: 'utility',
        description: 'Get Azure AD token for accessing external services.',
        minApiVersion: '4.0.0'
    }
];

export function getAvailableApis(category: string): string {
    const filterCategory = category.toLowerCase();

    let apis = AVAILABLE_APIS;
    if (filterCategory !== 'all') {
        apis = AVAILABLE_APIS.filter(api => api.category === filterCategory);
    }

    if (apis.length === 0) {
        return `No APIs found for category: ${category}

Available categories:
- **data**: Data loading and persistence
- **formatting**: Colors, themes, and format pane
- **interaction**: Selection, tooltips, context menu, drill-down
- **utility**: Localization, storage, events, dialogs
- **all**: Show all APIs`;
    }

    let output = `# 🔌 Power BI Visual APIs\n\n`;

    if (filterCategory !== 'all') {
        output += `Showing APIs in category: **${filterCategory}**\n\n`;
    }

    // Group by category
    const categories = ['data', 'formatting', 'interaction', 'utility'];

    for (const cat of categories) {
        const catApis = apis.filter(api => api.category === cat);
        if (catApis.length === 0) continue;

        const catEmoji = {
            data: '📊',
            formatting: '🎨',
            interaction: '🖱️',
            utility: '🔧'
        }[cat];

        output += `## ${catEmoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} APIs\n\n`;

        for (const api of catApis) {
            output += `### \`${api.name}\`\n`;
            output += `${api.description}\n\n`;
            output += `- **Minimum API Version**: ${api.minApiVersion}\n`;

            if (api.docsUrl) {
                output += `- **Documentation**: ${api.docsUrl}\n`;
            }

            if (api.example) {
                output += `\n**Example:**\n\`\`\`typescript\n${api.example}\n\`\`\`\n`;
            }
            output += '\n';
        }
    }

    output += `---\n`;
    output += `Full API reference: https://learn.microsoft.com/power-bi/developer/visuals/visuals-api\n`;

    return output;
}

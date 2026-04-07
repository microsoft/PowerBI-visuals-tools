/*
 *  Power BI Visual CLI - MCP Server - Available APIs Tool
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 */

"use strict";

import fs from 'fs-extra';
import path from 'path';

interface ApiInfo {
    name: string;
    category: 'data' | 'formatting' | 'interaction' | 'utility';
    description: string;
    minApiVersion: string;
    example?: string;
    docsUrl?: string;
    codePatterns?: RegExp[];
}

const AVAILABLE_APIS: ApiInfo[] = [
    // Data APIs
    {
        name: 'fetchMoreData',
        category: 'data',
        description: 'Enables loading additional data in chunks. Essential for large datasets that exceed the initial row limit.',
        minApiVersion: '2.6.0',        codePatterns: [/fetchMoreData/],        example: `// In update method
if (options.dataViews[0].metadata.segment) {
    host.fetchMoreData();
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/fetch-more-data'
    },
    {
        name: 'getDataViewSnapshot',
        category: 'data',
        description: 'Gets a snapshot of the current DataView for async processing.',
        minApiVersion: '5.1.0',
        codePatterns: [/getDataViewSnapshot/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/fetch-more-data'
    },
    {
        name: 'persistProperties',
        category: 'data',
        description: 'Allows visual to save properties that persist across sessions. Saved along with the visual definition.',
        minApiVersion: '1.3.0',
        codePatterns: [/persistProperties/],
        example: `host.persistProperties({
    replace: [{
        objectName: "settings",
        selector: null,
        properties: { myProperty: value }
    }]
});`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-api'
    },
    {
        name: 'applyJsonFilter (Basic Filter)',
        category: 'data',
        description: 'Apply a basic filter to filter data by specific values (In, NotIn, All operators). Uses IBasicFilter interface from powerbi-models.',
        minApiVersion: '1.7.0',
        codePatterns: [/applyJsonFilter/, /BasicFilter/],
        example: `import { BasicFilter } from "powerbi-models";

const filter = new BasicFilter(
    { table: "Sales", column: "Region" },
    "In",
    ["East", "West"]
);
host.applyJsonFilter(filter, "general", "filter", FilterAction.merge);`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/filter-api'
    },
    {
        name: 'applyJsonFilter (Advanced Filter)',
        category: 'data',
        description: 'Apply an advanced filter with complex conditions (LessThan, GreaterThan, Contains, IsBlank, etc.). Supports And/Or logic.',
        minApiVersion: '1.7.0',
        codePatterns: [/AdvancedFilter/],
        example: `import { AdvancedFilter } from "powerbi-models";
            const filter = new AdvancedFilter(
                { table: "Sales", column: "Amount" },
                "And",
                { operator: "GreaterThan", value: 100 },
                { operator: "LessThan", value: 1000 }
            );
            host.applyJsonFilter(filter, "general", "filter", FilterAction.merge);`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/filter-api'
    },
    {
        name: 'applyJsonFilter (Tuple Filter)',
        category: 'data',
        description: 'Apply a multi-column filter to filter data by combinations of values across multiple columns and tables.',
        minApiVersion: '2.3.0',
        codePatterns: [/TupleFilter/, /ITupleFilter/],
        example: `const filter: ITupleFilter = {
        $schema: "https://powerbi.com/product/schema#tuple",
        filterType: FilterType.Tuple,
        operator: "In",
        target: [
            { table: "DataTable", column: "Team" },
            { table: "DataTable", column: "Value" }
        ],
        values: [
            [{ value: "Team1" }, { value: 5 }],
            [{ value: "Team2" }, { value: 6 }]
        ]
    };
    host.applyJsonFilter(filter, "general", "filter", FilterAction.merge);`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/filter-api'
    },
    {
        name: 'applyCustomSort',
        category: 'data',
        description: 'Allows visual to apply custom sorting options to the data.',
        minApiVersion: '4.4.0',
        codePatterns: [/applyCustomSort/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/sort-options'
    },
    {
        name: 'refreshHostData',
        category: 'data',
        description: 'Requests the host to refresh the data for the visual.',
        minApiVersion: '2.6.0',
        codePatterns: [/refreshHostData/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-api'
    },

    // Formatting APIs  
    {
        name: 'colorPalette',
        category: 'formatting',
        description: 'Access the Power BI color palette for consistent theming.',
        minApiVersion: '2.1.0',
        codePatterns: [/colorPalette/, /getColor/],
        example: `const colors = host.colorPalette;
const color = colors.getColor("category1").value;`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-api'
    },
    {
        name: 'getFormattingModel',
        category: 'formatting',
        description: 'Modern formatting pane API. Returns formatting cards and groups for the Format pane.',
        minApiVersion: '5.1.0',
        codePatterns: [/getFormattingModel/, /FormattingModel/],
        example: `public getFormattingModel(): FormattingModel {
    return {
        cards: [{
            displayName: "My Settings",
            groups: [{
                displayName: "Font",
                slices: [
                    { displayName: "Size", control: { type: "NumUpDown", properties: { descriptor: { objectName: "font", propertyName: "size" } } } }
                ]
            }]
        }]
    };
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/format-pane'
    },
    {
        name: 'applyCustomColor',
        category: 'formatting',
        description: 'Apply custom colors that override theme colors for specific data points.',
        minApiVersion: '3.8.0',
        codePatterns: [/applyCustomColor/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-api'
    },
    {
        name: 'isHighContrastModeSupported',
        category: 'formatting',
        description: 'Detect and support Windows High Contrast mode for accessibility',
        minApiVersion: '2.6.0',
        codePatterns: [/allowHighContrast/, /highContrast/, /isHighContrast/],
        example: `if (host.hostCapabilities.allowHighContrast) {
    // Apply high contrast styling using colorPalette
    const foreground = host.colorPalette.foreground.value;
    const background = host.colorPalette.background.value;
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-api'
    },
    {
        name: 'conditionalFormatting',
        category: 'formatting',
        description: 'Support conditional formatting on visual properties. Users can set rules-based formatting in the format pane.',
        minApiVersion: '3.8.0',
        codePatterns: [/conditionalFormatting/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/conditional-format'
    },
    {
        name: 'onObjectFormatting',
        category: 'formatting',
        description: 'On-Object formatting allows users to format visual elements directly by clicking on them, without opening the format pane.',
        minApiVersion: '5.1.0',
        codePatterns: [/onObjectFormatting/, /SubSelectionService/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/on-object-formatting-api'
    },

    // Interaction APIs
    {
        name: 'selectionManager',
        category: 'interaction',
        description: 'Handle data point selection and cross-filtering with other visuals.',
        minApiVersion: '1.0.0',
        codePatterns: [/selectionManager/, /createSelectionManager/],
        example: `const selectionManager = host.createSelectionManager();
        const selectionId = host.createSelectionIdBuilder()
            .withCategory(categories, index)
            .createSelectionId();
        // On click:
        selectionManager.select(selectionId);`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/selection-api'
    },
    {
        name: 'tooltipService',
        category: 'interaction',
        description: 'Show rich tooltip/tooltips on hover with data details. Supports show, move, and hide operations.',
        minApiVersion: '1.7.0',
        codePatterns: [/tooltipService/, /ITooltipService/],
        example: `host.tooltipService.show({
        dataItems: [{ displayName: "Category", value: "East" }],
        coordinates: [x, y],
        isTouchEvent: false,
        identities: [selectionId]
    });`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/add-tooltips'
    },
    {
        name: 'reportPageTooltips',
        category: 'interaction',
        description: 'Enable report page tooltip support. Users can create custom tooltip pages and assign them to the visual from the format pane.',
        minApiVersion: '2.6.0',
        codePatterns: [/canvas.*true/, /supportedTypes/],
        example: `// In capabilities.json:
{
    "tooltips": {
        "supportedTypes": { "default": true, "canvas": true },
        "roles": ["tooltips"]
    }
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/add-tooltips'
    },
    {
        name: 'modernTooltips',
        category: 'interaction',
        description: 'Modern visual tooltip with drill actions and report theme styling. Add supportEnhancedTooltips in capabilities.json.',
        minApiVersion: '3.8.3',
        codePatterns: [/supportEnhancedTooltips/],
        example: `// In capabilities.json:
{
    "tooltips": {
        "supportedTypes": { "default": true, "canvas": true },
        "supportEnhancedTooltips": true,
        "roles": ["tooltips"]
    }
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/add-tooltips'
    },
    {
        name: 'contextMenuService',
        category: 'interaction',
        description: 'Show Power BI context menu on right-click with drill, filter, copy, and other actions.',
        minApiVersion: '2.5.0',
        codePatterns: [/contextMenuService/, /contextmenu/],
        example: `element.addEventListener("contextmenu", (e) => {
    host.contextMenuService.show({
        dataItems: contextMenuData,
        position: { x: e.clientX, y: e.clientY }
    });
    e.preventDefault();
});`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-api'
    },
    {
        name: 'launchUrl',
        category: 'interaction',
        description: 'Open external URLs in a new browser tab. Must be HTTPS for security.',
        minApiVersion: '1.7.0',
        codePatterns: [/launchUrl/],
        example: `host.launchUrl("https://example.com");`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/launch-url'
    },
    {
        name: 'drilldown',
        category: 'interaction',
        description: 'Enable drill-down/drill-up functionality for hierarchical data.',
        minApiVersion: '2.0.0',
        codePatterns: [/\.drill\(/, /drilldown/, /drillDown/],
        example: `// Drill down on a data point
host.drill({ dataRoles: ["category"], down: true });`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/drill-down-support'
    },
    {
        name: 'displayWarningIcon',
        category: 'interaction',
        description: 'Show a warning icon in the visual header with a custom title and detail message.',
        minApiVersion: '4.0.0',
        codePatterns: [/displayWarningIcon/],
        example: `host.displayWarningIcon("Data may be incomplete", "Some rows were filtered out due to data limits.");`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-display-warning-icon'
    },
    {
        name: 'allowInteractions',
        category: 'interaction',
        description: 'Check if visual interactions are allowed. Non-interactive in dashboard tiles, interactive in reports.',
        minApiVersion: '1.0.0',
        codePatterns: [/allowInteractions/],
        example: `const allowInteractions = options.host.hostCapabilities.allowInteractions;
bars.on('click', function(d) {
    if (allowInteractions) {
        selectionManager.select(d.selectionId);
    }
});`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visuals-interactions'
    },
    {
        name: 'bookmarkSupport',
        category: 'interaction',
        description: 'Save and restore visual state with Power BI bookmarks. Supports selection-based and filter-based bookmarks.',
        minApiVersion: '1.11.0',
        codePatterns: [/registerOnSelectCallback/, /bookmark/i],
        example: `// Register callback to restore selections from bookmark
selectionManager.registerOnSelectCallback(
    (ids: ISelectionId[]) => {
        dataPoints.forEach(dp => {
            dp.selected = ids.some(id => id.equals(dp.selectionId));
        });
    }
);`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/bookmarks-support'
    },
    {
        name: 'switchFocusModeState',
        category: 'interaction',
        description: 'Programmatically change the focus mode state of the visual (expand/collapse).',
        minApiVersion: '2.6.0',
        codePatterns: [/switchFocusModeState/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-api'
    },
    {
        name: 'selectionIdBuilder',
        category: 'interaction',
        description: 'Generate unique selection IDs for data points to enable cross-highlighting and cross-filtering.',
        minApiVersion: '1.0.0',
        codePatterns: [/selectionIdBuilder/, /createSelectionIdBuilder/, /SelectionId/],
        example: `const selectionId = host.createSelectionIdBuilder()
    .withCategory(categories, index)
    .withSeries(dataView.categorical.values, seriesValue)
    .withMeasure(measure.queryName)
    .createSelectionId();`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/selection-api'
    },

    // Utility APIs
    {
        name: 'createLocalizationManager',
        category: 'utility',
        description: 'Support multiple languages with string localization. Uses stringResources folder with JSON files per locale.',
        minApiVersion: '2.3.0',
        codePatterns: [/createLocalizationManager/, /getDisplayName/, /stringResources/],
        example: `const locManager = host.createLocalizationManager();
const text = locManager.getDisplayName("myKey");`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/localization'
    },
    {
        name: 'storageService',
        category: 'utility',
        description: 'Store data locally (up to 1MB) that persists across sessions. Uses key-value pair storage.',
        minApiVersion: '2.1.0',
        codePatterns: [/storageService/, /localStorageService/],
        example: `await host.storageService.set("myKey", "myValue");
const value = await host.storageService.get("myKey");`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/local-storage'
    },
    {
        name: 'storageV2Service',
        category: 'utility',
        description: 'Version 2 of the local storage service with improved API.',
        minApiVersion: '4.5.0',
        codePatterns: [/storageV2Service/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/local-storage'
    },
    {
        name: 'downloadService',
        category: 'utility',
        description: 'Trigger file download from the visual (e.g., export data to CSV, Excel, PDF).',
        minApiVersion: '3.8.0',
        codePatterns: [/downloadService/, /exportVisualsContent/],
        example: `host.downloadService.exportVisualsContent(
    csvContent,
    "data.csv",
    "text/csv"
);`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/file-download-api'
    },
    {
        name: 'eventService',
        category: 'utility',
        description: 'Report rendering events (started, finished, failed) for performance tracking. Required for certification.',
        minApiVersion: '2.7.0',
        codePatterns: [/eventService/, /renderingStarted/, /renderingFinished/, /renderingFailed/],
        example: `// Must be called in update():
host.eventService.renderingStarted(options);
try {
    // ... rendering logic
    host.eventService.renderingFinished(options);
} catch (e) {
    host.eventService.renderingFailed(options, e);
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/event-service'
    },
    {
        name: 'modalDialog',
        category: 'utility',
        description: 'Open a modal dialog for extended UI (configuration wizards, data entry forms, detailed views).',
        minApiVersion: '4.5.0',
        codePatterns: [/openModalDialog/, /modalDialog/, /DialogSizeOption/],
        example: `const dialogResult = await host.openModalDialog(
    dialogPage,
    { title: "Settings", size: DialogSizeOption.Medium }
);`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/create-display-dialog-box'
    },
    {
        name: 'authentication',
        category: 'utility',
        description: 'Get Microsoft Entra ID (Azure AD) token for accessing external services requiring authentication.',
        minApiVersion: '4.0.0',
        codePatterns: [/acquireAADTokenService/, /acquireToken/],
        example: `const token = await host.acquireAADTokenService.acquireToken({
    resource: "https://graph.microsoft.com"
});`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/authentication-api'
    },
    {
        name: 'webAccessService',
        category: 'utility',
        description: 'Check permission status for accessing remote resources. Requires WebAccess privilege in capabilities.json.',
        minApiVersion: '4.0.0',
        codePatterns: [/webAccessService/],
        example: `const result = await host.webAccessService.check("https://api.example.com");
if (result.accessAllowed) {
    // fetch data from external service
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/permissions-api'
    },
    {
        name: 'licenseManager',
        category: 'utility',
        description: 'Manage visual licensing. Check if user has specific license for premium features.',
        minApiVersion: '5.1.0',
        codePatterns: [/licenseManager/, /LicenseInfoResult/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/licensing-api'
    },
    {
        name: 'landingPage',
        category: 'utility',
        description: 'Show a custom landing page when the visual has no data. Set supportsLandingPage in capabilities.json.',
        minApiVersion: '2.6.0',
        codePatterns: [/supportsLandingPage/, /landingPage/],
        example: `// In capabilities.json:
{ "supportsLandingPage": true }

// In update():
if (options.dataViews.length === 0) {
    this.showLandingPage();
}`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/landing-page'
    },
    {
        name: 'subtotals',
        category: 'utility',
        description: 'Enable subtotals and totals support in matrix/table visuals. Configure via capabilities.json.',
        minApiVersion: '4.1.0',
        codePatterns: [/subtotals/, /SubtotalType/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/total-subtotal-api'
    },
    {
        name: 'telemetry',
        category: 'utility',
        description: 'Send telemetry trace events for diagnostics and performance monitoring.',
        minApiVersion: '2.6.0',
        codePatterns: [/telemetry/, /trace\(/],
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-api'
    },
    {
        name: 'instanceId',
        category: 'utility',
        description: 'Get a unique string identifier for the current visual instance. Useful for caching and state management.',
        minApiVersion: '2.1.0',
        codePatterns: [/instanceId/],
        example: `const id = host.instanceId; // unique per visual instance`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/visual-api'
    },
    {
        name: 'locale',
        category: 'utility',
        description: 'Get the current locale string (e.g., "en-US", "de-DE") for formatting numbers, dates, and strings.',
        minApiVersion: '1.3.0',
        codePatterns: [/host\.locale/, /\.locale/],
        example: `const locale = host.locale; // "en-US"
const formatter = new Intl.NumberFormat(locale);`,
        docsUrl: 'https://learn.microsoft.com/power-bi/developer/visuals/localization'
    }
];

async function getSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.tmp') {
            files.push(...await getSourceFiles(fullPath));
        } else if (/\.(ts|js|tsx|jsx)$/.test(entry.name)) {
            files.push(fullPath);
        }
    }
    return files;
}

interface ApiUsageInfo {
    used: boolean;
    files: string[];
}

async function scanProjectForApiUsage(rootPath: string): Promise<Map<string, ApiUsageInfo>> {
    const usageMap = new Map<string, ApiUsageInfo>();

    const srcPath = path.join(rootPath, 'src');
    const sourceFiles = await getSourceFiles(srcPath);

    // Also scan capabilities.json for config-based APIs
    const capabilitiesPath = path.join(rootPath, 'capabilities.json');
    let capabilitiesContent = '';
    if (fs.existsSync(capabilitiesPath)) {
        capabilitiesContent = await fs.readFile(capabilitiesPath, 'utf-8');
    }

    // Read all source files
    const fileContents: { file: string; content: string }[] = [];
    for (const file of sourceFiles) {
        const content = await fs.readFile(file, 'utf-8');
        fileContents.push({ file, content });
    }

    for (const api of AVAILABLE_APIS) {
        const info: ApiUsageInfo = { used: false, files: [] };

        if (api.codePatterns) {
            for (const pattern of api.codePatterns) {
                // Check source files
                for (const { file, content } of fileContents) {
                    if (pattern.test(content)) {
                        const relativePath = path.relative(rootPath, file);
                        if (!info.files.includes(relativePath)) {
                            info.files.push(relativePath);
                        }
                        info.used = true;
                    }
                }
                // Check capabilities.json
                if (capabilitiesContent && pattern.test(capabilitiesContent)) {
                    if (!info.files.includes('capabilities.json')) {
                        info.files.push('capabilities.json');
                    }
                    info.used = true;
                }
            }
        }

        usageMap.set(api.name, info);
    }

    return usageMap;
}

export async function getAvailableApis(category: string, rootPath?: string): Promise<string> {
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

    // Scan project for API usage if rootPath is provided
    let usageMap: Map<string, ApiUsageInfo> | null = null;
    if (rootPath) {
        try {
            usageMap = await scanProjectForApiUsage(rootPath);
        } catch {
            // If scanning fails, continue without usage info
        }
    }

    let output = `# 🔌 Power BI Visual APIs\n\n`;

    if (filterCategory !== 'all') {
        output += `Showing APIs in category: **${filterCategory}**\n\n`;
    }

    if (usageMap) {
        const usedCount = Array.from(usageMap.values()).filter(u => u.used).length;
        output += `**Project scan**: ${usedCount} of ${AVAILABLE_APIS.length} APIs detected in use\n\n`;
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
            const usage = usageMap?.get(api.name);
            const statusIcon = usage ? (usage.used ? '✅' : '❌') : '';
            
            output += `### ${statusIcon} \`${api.name}\`\n`;
            output += `${api.description}\n\n`;
            output += `- **Minimum API Version**: ${api.minApiVersion}\n`;

            if (usage?.used && usage.files.length > 0) {
                output += `- **Used in**: ${usage.files.join(', ')}\n`;
            } else if (usage && !usage.used) {
                output += `- **Status**: Not used in this project\n`;
            }

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

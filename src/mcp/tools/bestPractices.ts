/*
 *  Power BI Visual CLI - MCP Server - Best Practices Tool
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 */

"use strict";

import fs from 'fs-extra';
import path from 'path';

interface PracticeCheck {
    id: number;
    title: string;
    section: string;
    description: string;
    check: (ctx: ProjectContext) => { status: '✅' | '⚠️' | '❌'; detail: string };
}

interface ProjectContext {
    rootPath: string;
    tsconfigContent: string | null;
    capabilitiesContent: string | null;
    packageJsonContent: string | null;
    pbivizContent: string | null;
    sourceCode: string; // concatenated source files
    sourceFiles: string[];
    hasReadme: boolean;
    hasChangelog: boolean;
    hasEslint: boolean;
    hasTests: boolean;
}

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

async function buildProjectContext(rootPath: string): Promise<ProjectContext> {
    const readJsonSafe = async (filePath: string): Promise<string | null> => {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch {
            return null;
        }
    };

    const srcPath = path.join(rootPath, 'src');
    const sourceFiles = await getSourceFiles(srcPath);
    let sourceCode = '';
    for (const file of sourceFiles) {
        sourceCode += await fs.readFile(file, 'utf-8') + '\n';
    }

    return {
        rootPath,
        tsconfigContent: await readJsonSafe(path.join(rootPath, 'tsconfig.json')),
        capabilitiesContent: await readJsonSafe(path.join(rootPath, 'capabilities.json')),
        packageJsonContent: await readJsonSafe(path.join(rootPath, 'package.json')),
        pbivizContent: await readJsonSafe(path.join(rootPath, 'pbiviz.json')),
        sourceCode,
        sourceFiles: sourceFiles.map(f => path.relative(rootPath, f)),
        hasReadme: fs.existsSync(path.join(rootPath, 'README.md')),
        hasChangelog: fs.existsSync(path.join(rootPath, 'Changelog.md')) || fs.existsSync(path.join(rootPath, 'CHANGELOG.md')),
        hasEslint: fs.existsSync(path.join(rootPath, 'eslint.config.mjs')) || fs.existsSync(path.join(rootPath, '.eslintrc.json')) || fs.existsSync(path.join(rootPath, '.eslintrc.js')),
        hasTests: fs.existsSync(path.join(rootPath, 'test')) || fs.existsSync(path.join(rootPath, 'spec')) || fs.existsSync(path.join(rootPath, '__tests__')),
    };
}

const PRACTICES: PracticeCheck[] = [
    {
        id: 1, section: 'API & Version Management', title: 'Use Latest API Version',
        description: 'Always use the latest stable powerbi-visuals-api (currently v5.x)',
        check: (ctx) => {
            if (!ctx.packageJsonContent) return { status: '⚠️', detail: 'package.json not found' };
            const match = ctx.packageJsonContent.match(/"powerbi-visuals-api"\s*:\s*"[~^]?(\d+)/);
            if (!match) return { status: '⚠️', detail: 'powerbi-visuals-api not found in dependencies' };
            const major = parseInt(match[1]);
            if (major >= 5) return { status: '✅', detail: `Using API v${match[1]}.x` };
            return { status: '⚠️', detail: `Using API v${match[1]}.x — consider upgrading to v5.x` };
        }
    },
    {
        id: 2, section: 'API & Version Management', title: 'TypeScript Strict Mode',
        description: 'Enable strict mode in tsconfig.json for better type safety',
        check: (ctx) => {
            if (!ctx.tsconfigContent) return { status: '⚠️', detail: 'tsconfig.json not found' };
            if (/"strict"\s*:\s*true/.test(ctx.tsconfigContent)) return { status: '✅', detail: 'Strict mode enabled' };
            return { status: '❌', detail: 'Strict mode not enabled — add `"strict": true` to tsconfig.json' };
        }
    },
    {
        id: 3, section: 'Performance', title: 'Minimize Update Loop Work',
        description: 'Cache DOM selections, use data binding efficiently',
        check: (ctx) => {
            const hasUpdate = /update\s*\(/.test(ctx.sourceCode);
            if (!hasUpdate) return { status: '⚠️', detail: 'No update() method found' };
            const hasD3Join = /\.join\(/.test(ctx.sourceCode) || /\.enter\(\)/.test(ctx.sourceCode);
            if (hasD3Join) return { status: '✅', detail: 'D3 data binding patterns detected' };
            return { status: '⚠️', detail: 'Consider using D3 .join() pattern for efficient data binding' };
        }
    },
    {
        id: 4, section: 'Performance', title: 'FetchMoreData for Large Datasets',
        description: 'Implement pagination for datasets exceeding initial row limit',
        check: (ctx) => {
            if (/fetchMoreData/.test(ctx.sourceCode)) return { status: '✅', detail: 'fetchMoreData is implemented' };
            return { status: '⚠️', detail: 'Consider implementing fetchMoreData for large datasets' };
        }
    },
    {
        id: 5, section: 'Performance', title: 'Optimize Data Processing',
        description: 'Process data once in update(), store results',
        check: (ctx) => {
            const hasViewModel = /viewModel|ViewModel|dataModel|DataModel/.test(ctx.sourceCode);
            if (hasViewModel) return { status: '✅', detail: 'Data model/view model pattern detected' };
            return { status: '⚠️', detail: 'Consider creating a ViewModel to separate data processing from rendering' };
        }
    },
    {
        id: 6, section: 'Security', title: 'No External Network Calls',
        description: 'Avoid fetch/XMLHttpRequest to external URLs',
        check: (ctx) => {
            const hasExternal = /fetch\s*\(\s*['"`]http/.test(ctx.sourceCode) || /XMLHttpRequest/.test(ctx.sourceCode);
            if (hasExternal) return { status: '❌', detail: 'External network calls detected — remove for certification' };
            return { status: '✅', detail: 'No external network calls found' };
        }
    },
    {
        id: 7, section: 'Security', title: 'No eval() or Function()',
        description: 'Never use dynamic code execution',
        check: (ctx) => {
            const hasEval = /eval\s*\(/.test(ctx.sourceCode) || /new\s+Function\s*\(/.test(ctx.sourceCode);
            if (hasEval) return { status: '❌', detail: 'Dynamic code execution detected — security risk' };
            return { status: '✅', detail: 'No dynamic code execution found' };
        }
    },
    {
        id: 8, section: 'Security', title: 'Sanitize User Input',
        description: 'Escape HTML in tooltips and labels',
        check: (ctx) => {
            const hasInnerHTML = /innerHTML\s*=/.test(ctx.sourceCode);
            if (hasInnerHTML) return { status: '⚠️', detail: 'innerHTML usage detected — ensure data is sanitized' };
            return { status: '✅', detail: 'No direct innerHTML assignment found' };
        }
    },
    {
        id: 9, section: 'Accessibility', title: 'Keyboard Navigation',
        description: 'Support Tab navigation and keyboard shortcuts',
        check: (ctx) => {
            const capHasKeys = ctx.capabilitiesContent && /supportsKeyboardFocus/.test(ctx.capabilitiesContent);
            const codeHasKeys = /keydown|keyup|keypress|tabindex|focusable/.test(ctx.sourceCode);
            if (capHasKeys || codeHasKeys) return { status: '✅', detail: 'Keyboard navigation support detected' };
            return { status: '⚠️', detail: 'No keyboard navigation detected — required for certification' };
        }
    },
    {
        id: 10, section: 'Accessibility', title: 'High Contrast Mode',
        description: 'Support all high contrast themes',
        check: (ctx) => {
            const hasHC = /highContrast|isHighContrast|allowHighContrast/.test(ctx.sourceCode);
            if (hasHC) return { status: '✅', detail: 'High contrast mode support detected' };
            return { status: '⚠️', detail: 'No high contrast support detected — required for certification' };
        }
    },
    {
        id: 11, section: 'Accessibility', title: 'Screen Reader Support',
        description: 'Add proper ARIA labels to interactive elements',
        check: (ctx) => {
            const hasAria = /aria-label|aria-role|role=/.test(ctx.sourceCode);
            if (hasAria) return { status: '✅', detail: 'ARIA attributes detected' };
            return { status: '⚠️', detail: 'No ARIA labels found — add for better accessibility' };
        }
    },
    {
        id: 12, section: 'Rendering Events', title: 'Rendering Events (Required)',
        description: 'Report renderingStarted/renderingFinished/renderingFailed events',
        check: (ctx) => {
            const hasStarted = /renderingStarted/.test(ctx.sourceCode);
            const hasFinished = /renderingFinished/.test(ctx.sourceCode);
            const hasFailed = /renderingFailed/.test(ctx.sourceCode);
            if (hasStarted && hasFinished && hasFailed) return { status: '✅', detail: 'All 3 rendering events implemented' };
            if (hasStarted || hasFinished) return { status: '⚠️', detail: 'Partial rendering events — need renderingStarted, renderingFinished, AND renderingFailed' };
            return { status: '❌', detail: 'No rendering events found — required for certification' };
        }
    },
    {
        id: 13, section: 'Formatting', title: 'Modern Formatting Pane',
        description: 'Use getFormattingModel() for the modern format pane',
        check: (ctx) => {
            if (/getFormattingModel/.test(ctx.sourceCode)) return { status: '✅', detail: 'Modern formatting pane (getFormattingModel) detected' };
            if (/enumerateObjectInstances/.test(ctx.sourceCode)) return { status: '⚠️', detail: 'Using legacy format pane — consider migrating to getFormattingModel()' };
            return { status: '⚠️', detail: 'No formatting pane implementation detected' };
        }
    },
    {
        id: 14, section: 'Project Structure', title: 'Modular Code',
        description: 'Split code into logical modules',
        check: (ctx) => {
            if (ctx.sourceFiles.length > 2) return { status: '✅', detail: `${ctx.sourceFiles.length} source files — good modular structure` };
            return { status: '⚠️', detail: `Only ${ctx.sourceFiles.length} source file(s) — consider splitting into modules` };
        }
    },
    {
        id: 15, section: 'Project Structure', title: 'Error Handling',
        description: 'Wrap rendering logic in try/catch',
        check: (ctx) => {
            if (/try\s*\{/.test(ctx.sourceCode) && /catch\s*\(/.test(ctx.sourceCode)) return { status: '✅', detail: 'Error handling (try/catch) detected' };
            return { status: '⚠️', detail: 'No try/catch found — add error handling around rendering logic' };
        }
    },
    {
        id: 16, section: 'Testing', title: 'Tests Present',
        description: 'Unit tests and visual tests',
        check: (ctx) => {
            if (ctx.hasTests) return { status: '✅', detail: 'Test directory found' };
            return { status: '⚠️', detail: 'No tests found — add unit tests for data transformation logic' };
        }
    },
    {
        id: 17, section: 'Testing', title: 'ESLint Configured',
        description: 'Use ESLint for code quality',
        check: (ctx) => {
            if (ctx.hasEslint) return { status: '✅', detail: 'ESLint configuration found' };
            return { status: '⚠️', detail: 'No ESLint config — add for consistent code quality' };
        }
    },
    {
        id: 18, section: 'Documentation', title: 'README.md',
        description: 'Document visual capabilities and usage',
        check: (ctx) => {
            if (ctx.hasReadme) return { status: '✅', detail: 'README.md found' };
            return { status: '❌', detail: 'No README.md — add documentation' };
        }
    },
    {
        id: 19, section: 'Documentation', title: 'Changelog',
        description: 'Track version changes',
        check: (ctx) => {
            if (ctx.hasChangelog) return { status: '✅', detail: 'Changelog found' };
            return { status: '⚠️', detail: 'No Changelog — consider adding one' };
        }
    },
    {
        id: 20, section: 'Context Menu', title: 'Context Menu Support',
        description: 'Right-click context menu for drill, filter, and other actions',
        check: (ctx) => {
            if (/contextMenuService/.test(ctx.sourceCode)) return { status: '✅', detail: 'Context menu implemented' };
            return { status: '⚠️', detail: 'No context menu — add right-click support for better UX' };
        }
    },
];

export async function getBestPractices(rootPath?: string): Promise<string> {
    // If no rootPath, return static list
    if (!rootPath || !fs.existsSync(rootPath)) {
        return getStaticBestPractices();
    }

    // Build project context and check each practice
    const ctx = await buildProjectContext(rootPath);

    let output = `# Power BI Custom Visual Best Practices\n\n`;
    output += `**Project scan results for**: ${path.basename(rootPath)}\n\n`;

    let passed = 0;
    let warnings = 0;
    let failed = 0;

    const sections = new Map<string, string[]>();

    for (const practice of PRACTICES) {
        const result = practice.check(ctx);
        if (result.status === '✅') passed++;
        else if (result.status === '⚠️') warnings++;
        else failed++;

        const line = `${result.status} **${practice.id}. ${practice.title}**: ${result.detail}`;

        if (!sections.has(practice.section)) {
            sections.set(practice.section, []);
        }
        sections.get(practice.section)!.push(line);
    }

    output += `## 📊 Summary: ${passed} passed, ${warnings} warnings, ${failed} issues\n\n`;

    for (const [section, lines] of sections) {
        const sectionEmoji: Record<string, string> = {
            'API & Version Management': '🎯',
            'Performance': '⚡',
            'Security': '🔒',
            'Accessibility': '♿',
            'Rendering Events': '📡',
            'Formatting': '🎨',
            'Project Structure': '📦',
            'Testing': '🧪',
            'Documentation': '📝',
            'Context Menu': '🖱️',
        };
        output += `### ${sectionEmoji[section] || '📋'} ${section}\n\n`;
        for (const line of lines) {
            output += `${line}\n\n`;
        }
    }

    output += `---\nFor more details, visit: https://learn.microsoft.com/en-us/power-bi/developer/visuals/\n`;

    return output;
}

function getStaticBestPractices(): string {
    return `# Power BI Custom Visual Best Practices

## 🎯 API & Version Management

1. **Use Latest API Version**: Always use the latest stable powerbi-visuals-api (currently v5.x)
   - Run: \`npm install powerbi-visuals-api@latest\`
   - Update apiVersion in pbiviz.json

2. **TypeScript Strict Mode**: Enable strict mode in tsconfig.json for better type safety
   \`\`\`json
   { "compilerOptions": { "strict": true } }
   \`\`\`

## ⚡ Performance Optimization

3. **Minimize Update Loop Work**: The \`update()\` method is called frequently
   - Cache DOM selections
   - Use data binding efficiently (D3.js .join() pattern)
   - Avoid heavy computations in update()

4. **Use Lazy Loading**: Load resources only when needed
   - Defer non-critical rendering
   - Use requestAnimationFrame for smooth animations

5. **Optimize Data Processing**:
   - Process data once in update(), store results
   - Use Web Workers for heavy calculations
   - Implement pagination with fetchMoreData for large datasets

## 🔒 Security Guidelines

6. **No External Network Calls**: Avoid fetch/XMLHttpRequest to external URLs
   - Use only Power BI host services
   - Required for certification

7. **Sanitize User Input**: Always sanitize data before rendering
   - Escape HTML in tooltips and labels
   - Prevent XSS vulnerabilities

8. **No eval() or Function()**: Never use dynamic code execution

## ♿ Accessibility (Required for Certification)

9. **Keyboard Navigation**: Implement IVisualHost.hostCapabilities
   - Support Tab navigation
   - Provide keyboard shortcuts

10. **High Contrast Mode**: Support all high contrast themes
    - Use host.colorPalette for colors
    - Test with Windows High Contrast

11. **Screen Reader Support**: Add proper ARIA labels
    - role attributes on interactive elements
    - aria-label for data points

## 📦 Project Structure

12. **Modular Code**: Split code into logical modules
    - Separate data transformation, rendering, and formatting
    - Use ES6 modules

13. **Proper Error Handling**: Graceful degradation
    \`\`\`typescript
    try {
        // rendering logic
    } catch (e) {
        console.error('Visual error:', e);
    }
    \`\`\`

## 🎨 Formatting Pane (Modern)

14. **Use FormattingModel**: Implement getFormattingModel() for modern formatting
    - Provides better UX than legacy format pane
    - Required for new visuals

## 🧪 Testing

15. **Unit Tests**: Test data transformation logic
16. **Visual Tests**: Use Playwright or similar for E2E tests
17. **Test Edge Cases**: Empty data, single point, large datasets

## 📝 Documentation

18. **README.md**: Document visual capabilities and usage
19. **Changelog**: Track version changes
20. **Inline Comments**: Document complex logic

---
For more details, visit: https://learn.microsoft.com/en-us/power-bi/developer/visuals/
`;
}

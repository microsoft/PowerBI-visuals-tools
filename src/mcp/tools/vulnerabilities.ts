/*
 *  Power BI Visual CLI - MCP Server - Vulnerabilities Check Tool
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 */

"use strict";

import fs from 'fs-extra';
import path from 'path';

interface VulnerabilityResult {
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    message: string;
    recommendation?: string;
}

// Dangerous patterns in code
const CODE_PATTERNS = [
    { pattern: /eval\s*\(/, message: 'Use of eval() is a security risk', severity: 'critical' as const },
    { pattern: /new\s+Function\s*\(/, message: 'Dynamic Function construction is a security risk', severity: 'critical' as const },
    { pattern: /innerHTML\s*=/, message: 'Direct innerHTML assignment may cause XSS vulnerabilities', severity: 'medium' as const },
    { pattern: /document\.write/, message: 'document.write is deprecated and can be dangerous', severity: 'medium' as const },
    { pattern: /window\.location\s*=/, message: 'Direct location assignment might be a security concern', severity: 'low' as const },
    { pattern: /fetch\s*\(\s*['"`]http/, message: 'External HTTP calls are not allowed in certified visuals', severity: 'high' as const },
    { pattern: /XMLHttpRequest/, message: 'XMLHttpRequest to external URLs is not allowed in certified visuals', severity: 'high' as const },
];

async function checkSourceCode(rootPath: string): Promise<VulnerabilityResult[]> {
    const results: VulnerabilityResult[] = [];
    const srcPath = path.join(rootPath, 'src');

    if (!fs.existsSync(srcPath)) {
        return results;
    }

    const files = await getSourceFiles(srcPath);

    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(rootPath, file);

        for (const codePattern of CODE_PATTERNS) {
            let inBlockComment = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Track block comments
                if (!inBlockComment && line.includes('/*')) {
                    inBlockComment = true;
                }
                if (inBlockComment) {
                    if (line.includes('*/')) {
                        inBlockComment = false;
                    }
                    if (codePattern.pattern.test(line)) {
                        results.push({
                            severity: 'info',
                            message: `${relativePath}:${i + 1}: ${codePattern.message} (commented out)`,
                            recommendation: 'Remove commented-out dangerous code to keep the codebase clean'
                        });
                    }
                    continue;
                }

                // Check single-line comments
                const trimmed = line.trimStart();
                if (trimmed.startsWith('//') && codePattern.pattern.test(line)) {
                    results.push({
                        severity: 'info',
                        message: `${relativePath}:${i + 1}: ${codePattern.message} (commented out)`,
                        recommendation: 'Remove commented-out dangerous code to keep the codebase clean'
                    });
                    continue;
                }

                // Active code match
                if (codePattern.pattern.test(line)) {
                    results.push({
                        severity: codePattern.severity,
                        message: `${relativePath}:${i + 1}: ${codePattern.message}`
                    });
                }
            }
        }
    }

    return results;
}

async function getSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') {
            files.push(...await getSourceFiles(fullPath));
        } else if (entry.isFile() && /\.(ts|js|tsx|jsx)$/.test(entry.name)) {
            files.push(fullPath);
        }
    }

    return files;
}

function formatResults(results: VulnerabilityResult[]): string {
    if (results.length === 0) {
        return `✅ **No vulnerabilities detected!**

Your visual project passed the security scan. Keep following best practices:
- Regularly update dependencies
- Run \`npm audit\` periodically
- Avoid external network calls
- Sanitize all user inputs
`;
    }

    const grouped = {
        critical: results.filter(r => r.severity === 'critical'),
        high: results.filter(r => r.severity === 'high'),
        medium: results.filter(r => r.severity === 'medium'),
        low: results.filter(r => r.severity === 'low'),
        info: results.filter(r => r.severity === 'info'),
    };

    let output = `# 🔍 Vulnerability Scan Results\n\n`;
    output += `Found **${results.length}** issue(s)\n\n`;

    if (grouped.critical.length > 0) {
        output += `## 🔴 Critical (${grouped.critical.length})\n`;
        grouped.critical.forEach(r => {
            output += `- ${r.message}\n`;
            if (r.recommendation) output += `  💡 ${r.recommendation}\n`;
        });
        output += '\n';
    }

    if (grouped.high.length > 0) {
        output += `## 🟠 High (${grouped.high.length})\n`;
        grouped.high.forEach(r => {
            output += `- ${r.message}\n`;
            if (r.recommendation) output += `  💡 ${r.recommendation}\n`;
        });
        output += '\n';
    }

    if (grouped.medium.length > 0) {
        output += `## 🟡 Medium (${grouped.medium.length})\n`;
        grouped.medium.forEach(r => {
            output += `- ${r.message}\n`;
            if (r.recommendation) output += `  💡 ${r.recommendation}\n`;
        });
        output += '\n';
    }

    if (grouped.low.length > 0) {
        output += `## 🟢 Low (${grouped.low.length})\n`;
        grouped.low.forEach(r => {
            output += `- ${r.message}\n`;
            if (r.recommendation) output += `  💡 ${r.recommendation}\n`;
        });
        output += '\n';
    }

    if (grouped.info.length > 0) {
        output += `## ℹ️ Info (${grouped.info.length})\n`;
        grouped.info.forEach(r => {
            output += `- ${r.message}\n`;
            if (r.recommendation) output += `  💡 ${r.recommendation}\n`;
        });
        output += '\n';
    }

    output += `---\n`;
    output += `Run \`npm audit\` for a more comprehensive dependency audit.\n`;

    return output;
}

async function checkEslint(rootPath: string): Promise<VulnerabilityResult[]> {
    const results: VulnerabilityResult[] = [];
    const packageJsonPath = path.join(rootPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        return results;
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
    };

    if (!allDeps['eslint']) {
        results.push({
            severity: 'info',
            message: 'ESLint is not configured',
            recommendation: 'Add ESLint for code quality and security linting'
        });
    }

    return results;
}

export async function checkVulnerabilities(rootPath: string): Promise<string> {
    try {
        const codeResults = await checkSourceCode(rootPath);
        const eslintResults = await checkEslint(rootPath);

        return formatResults([...codeResults, ...eslintResults]);
    } catch (error) {
        return `❌ Error scanning project: ${error.message}`;
    }
}

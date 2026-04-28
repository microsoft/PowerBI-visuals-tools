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
import { getSourceFiles } from '../../utils.js';

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
    { pattern: /\bfetch\s*\(/, message: 'Use of fetch() is not allowed in certified visuals (external network calls are prohibited)', severity: 'high' as const },
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

        let inBlockComment = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Split line into activeCode and commentedCode by walking
            // left-to-right through /*, */, and // markers
            let activeCode = '';
            let commentedCode = '';
            let pos = 0;

            while (pos < line.length) {
                if (inBlockComment) {
                    const endIdx = line.indexOf('*/', pos);
                    if (endIdx !== -1) {
                        commentedCode += line.substring(pos, endIdx + 2);
                        pos = endIdx + 2;
                        inBlockComment = false;
                    } else {
                        commentedCode += line.substring(pos);
                        break;
                    }
                } else {
                    const blockStart = line.indexOf('/*', pos);
                    const lineComment = line.indexOf('//', pos);

                    // Find which comment marker comes first
                    let nextComment = -1;
                    let isBlock = false;

                    if (blockStart !== -1 && (lineComment === -1 || blockStart <= lineComment)) {
                        nextComment = blockStart;
                        isBlock = true;
                    } else if (lineComment !== -1) {
                        nextComment = lineComment;
                    }

                    if (nextComment === -1) {
                        activeCode += line.substring(pos);
                        break;
                    }

                    activeCode += line.substring(pos, nextComment);

                    if (isBlock) {
                        const endIdx = line.indexOf('*/', nextComment + 2);
                        if (endIdx !== -1) {
                            commentedCode += line.substring(nextComment, endIdx + 2);
                            pos = endIdx + 2;
                        } else {
                            commentedCode += line.substring(nextComment);
                            inBlockComment = true;
                            break;
                        }
                    } else {
                        // Line comment — rest of line is commented
                        commentedCode += line.substring(nextComment);
                        break;
                    }
                }
            }

            // Check all patterns against the appropriate segment
            for (const codePattern of CODE_PATTERNS) {
                const inActive = codePattern.pattern.test(activeCode);
                const inComment = codePattern.pattern.test(commentedCode);

                if (inActive) {
                    results.push({
                        severity: codePattern.severity,
                        message: `${relativePath}:${i + 1}: ${codePattern.message}`
                    });
                } else if (inComment) {
                    results.push({
                        severity: 'info',
                        message: `${relativePath}:${i + 1}: ${codePattern.message} (commented out)`,
                        recommendation: 'Remove commented-out dangerous code to keep the codebase clean'
                    });
                }
            }
        }
    }

    return results;
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
        return `❌ Error scanning project: ${(error instanceof Error) ? error.message : String(error)}`;
    }
}

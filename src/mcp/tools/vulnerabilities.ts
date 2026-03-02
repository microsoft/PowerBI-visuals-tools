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

// Known problematic packages or patterns
const KNOWN_VULNERABILITIES = [
    { pattern: /^lodash$/, minVersion: '4.17.21', message: 'Lodash versions below 4.17.21 have known vulnerabilities', severity: 'high' as const },
    { pattern: /^jquery$/, minVersion: '3.5.0', message: 'jQuery versions below 3.5.0 have XSS vulnerabilities', severity: 'high' as const },
    { pattern: /^moment$/, minVersion: null, message: 'Consider replacing moment.js with date-fns or dayjs (smaller bundle)', severity: 'info' as const },
];

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

async function checkPackageJson(rootPath: string): Promise<VulnerabilityResult[]> {
    const results: VulnerabilityResult[] = [];
    const packageJsonPath = path.join(rootPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        results.push({
            severity: 'info',
            message: 'No package.json found in the project root'
        });
        return results;
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
    };

    for (const [pkg, version] of Object.entries(allDeps)) {
        for (const vuln of KNOWN_VULNERABILITIES) {
            if (vuln.pattern.test(pkg)) {
                // For packages with minVersion, check if current version is below
                if (vuln.minVersion) {
                    const currentVersion = (version as string).replace(/[\^~>=<]/g, '');
                    const minParts = vuln.minVersion.split('.').map(Number);
                    const curParts = currentVersion.split('.').map(Number);

                    let isVulnerable = false;
                    for (let i = 0; i < Math.min(minParts.length, curParts.length); i++) {
                        if (curParts[i] < minParts[i]) {
                            isVulnerable = true;
                            break;
                        } else if (curParts[i] > minParts[i]) {
                            break;
                        }
                    }

                    if (isVulnerable) {
                        results.push({
                            severity: vuln.severity,
                            message: `${pkg}@${version}: ${vuln.message}`,
                            recommendation: `Update to ${pkg}@${vuln.minVersion} or higher`
                        });
                    }
                } else {
                    // General warning (like moment.js)
                    results.push({
                        severity: vuln.severity,
                        message: `${pkg}@${version}: ${vuln.message}`,
                        recommendation: `Consider alternatives to ${pkg}`
                    });
                }
            }
        }
    }

    // Check for missing security-related devDependencies
    if (!allDeps['eslint']) {
        results.push({
            severity: 'info',
            message: 'ESLint is not configured',
            recommendation: 'Add ESLint for code quality and security linting'
        });
    }

    return results;
}

async function checkSourceCode(rootPath: string): Promise<VulnerabilityResult[]> {
    const results: VulnerabilityResult[] = [];
    const srcPath = path.join(rootPath, 'src');

    if (!fs.existsSync(srcPath)) {
        return results;
    }

    const files = await getSourceFiles(srcPath);

    for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(rootPath, file);

        for (const pattern of CODE_PATTERNS) {
            if (pattern.pattern.test(content)) {
                results.push({
                    severity: pattern.severity,
                    message: `${relativePath}: ${pattern.message}`
                });
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

export async function checkVulnerabilities(rootPath: string): Promise<string> {
    try {
        const packageResults = await checkPackageJson(rootPath);
        const codeResults = await checkSourceCode(rootPath);
        const allResults = [...packageResults, ...codeResults];

        return formatResults(allResults);
    } catch (error) {
        return `❌ Error scanning project: ${error.message}`;
    }
}

/*
 *  Power BI Visual CLI - MCP Server - Certification Preparation Tool
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 */

"use strict";

import fs from 'fs-extra';
import path from 'path';
import { getSourceFiles, existsIgnoreCase } from '../../utils.js';

interface CertificationCheck {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    recommendation?: string;
}

const REQUIRED_FILES = [
    { file: 'pbiviz.json', description: 'Visual configuration file' },
    { file: 'capabilities.json', description: 'Visual capabilities definition' },
    { file: 'package.json', description: 'Node.js package configuration' },
    { file: 'tsconfig.json', description: 'TypeScript configuration' },
];

const RECOMMENDED_FILES = [
    { file: 'README.md', description: 'Documentation' },
    { file: 'CHANGELOG.md', description: 'Version history' },
    { file: 'LICENSE', description: 'License file' },
];

async function checkRequiredFiles(rootPath: string): Promise<CertificationCheck[]> {
    const checks: CertificationCheck[] = [];

    for (const { file, description } of REQUIRED_FILES) {
        const exists = existsIgnoreCase(path.join(rootPath, file));
        checks.push({
            name: `Required: ${file}`,
            status: exists ? 'pass' : 'fail',
            message: exists ? `${description} found` : `Missing ${description}`,
            recommendation: exists ? undefined : `Create ${file} in project root`
        });
    }

    for (const { file, description } of RECOMMENDED_FILES) {
        const exists = existsIgnoreCase(path.join(rootPath, file));
        checks.push({
            name: `Recommended: ${file}`,
            status: exists ? 'pass' : 'warning',
            message: exists ? `${description} found` : `Missing ${description}`,
            recommendation: exists ? undefined : `Consider adding ${file}`
        });
    }

    return checks;
}

async function checkPbivizConfig(rootPath: string): Promise<CertificationCheck[]> {
    const checks: CertificationCheck[] = [];
    const pbivizPath = path.join(rootPath, 'pbiviz.json');

    if (!fs.existsSync(pbivizPath)) {
        return [{
            name: 'pbiviz.json validation',
            status: 'fail',
            message: 'Cannot validate - pbiviz.json not found'
        }];
    }

    const config = await fs.readJson(pbivizPath);

    // Check visual name
    if (config.visual?.name) {
        checks.push({
            name: 'Visual Name',
            status: 'pass',
            message: `Visual name: ${config.visual.name}`
        });
    } else {
        checks.push({
            name: 'Visual Name',
            status: 'fail',
            message: 'Visual name is missing',
            recommendation: 'Add "visual.name" to pbiviz.json'
        });
    }

    // Check GUID
    if (config.visual?.guid && /^[a-zA-Z0-9_]+$/.test(config.visual.guid)) {
        checks.push({
            name: 'Visual GUID',
            status: 'pass',
            message: `GUID: ${config.visual.guid}`
        });
    } else {
        checks.push({
            name: 'Visual GUID',
            status: 'fail',
            message: 'Invalid or missing visual GUID',
            recommendation: 'Ensure visual.guid contains only alphanumeric characters and underscores'
        });
    }

    // Check version format
    const version = config.visual?.version;
    if (version && /^\d+\.\d+\.\d+(\.\d+)?$/.test(version)) {
        checks.push({
            name: 'Visual Version',
            status: 'pass',
            message: `Version: ${version}`
        });
    } else {
        checks.push({
            name: 'Visual Version',
            status: 'fail',
            message: 'Invalid version format',
            recommendation: 'Use semantic versioning (e.g., 1.0.0 or 1.0.0.0)'
        });
    }

    // Check API version
    const apiVersion = config.apiVersion;
    if (apiVersion) {
        const majorVersion = parseInt(apiVersion.split('.')[0], 10);
        if (majorVersion >= 3) {
            checks.push({
                name: 'API Version',
                status: 'pass',
                message: `API version: ${apiVersion}`
            });
        } else {
            checks.push({
                name: 'API Version',
                status: 'warning',
                message: `API version ${apiVersion} is outdated`,
                recommendation: 'Update to API version 5.x or higher'
            });
        }
    } else {
        checks.push({
            name: 'API Version',
            status: 'fail',
            message: 'API version not specified',
            recommendation: 'Add "apiVersion" to pbiviz.json'
        });
    }

    // Check author info
    if (config.author?.name && config.author?.email) {
        checks.push({
            name: 'Author Information',
            status: 'pass',
            message: `Author: ${config.author.name} <${config.author.email}>`
        });
    } else {
        checks.push({
            name: 'Author Information',
            status: 'warning',
            message: 'Incomplete author information',
            recommendation: 'Add author.name and author.email to pbiviz.json'
        });
    }

    // Check support URL
    if (config.visual?.supportUrl) {
        checks.push({
            name: 'Support URL',
            status: 'pass',
            message: `Support URL: ${config.visual.supportUrl}`
        });
    } else {
        checks.push({
            name: 'Support URL',
            status: 'warning',
            message: 'Support URL not provided',
            recommendation: 'Add visual.supportUrl for user support'
        });
    }

    return checks;
}

async function checkCapabilities(rootPath: string): Promise<CertificationCheck[]> {
    const checks: CertificationCheck[] = [];
    const capabilitiesPath = path.join(rootPath, 'capabilities.json');

    if (!fs.existsSync(capabilitiesPath)) {
        return [{
            name: 'capabilities.json validation',
            status: 'fail',
            message: 'Cannot validate - capabilities.json not found'
        }];
    }

    const capabilities = await fs.readJson(capabilitiesPath);

    // Check data roles
    if (capabilities.dataRoles && Array.isArray(capabilities.dataRoles) && capabilities.dataRoles.length > 0) {
        checks.push({
            name: 'Data Roles',
            status: 'pass',
            message: `${capabilities.dataRoles.length} data role(s) defined`
        });
    } else {
        checks.push({
            name: 'Data Roles',
            status: 'warning',
            message: 'No data roles defined',
            recommendation: 'Define dataRoles in capabilities.json for data binding'
        });
    }

    // Check data view mappings
    if (capabilities.dataViewMappings && Array.isArray(capabilities.dataViewMappings)) {
        checks.push({
            name: 'Data View Mappings',
            status: 'pass',
            message: `${capabilities.dataViewMappings.length} mapping(s) defined`
        });
    } else {
        checks.push({
            name: 'Data View Mappings',
            status: 'fail',
            message: 'No dataViewMappings defined',
            recommendation: 'Define dataViewMappings in capabilities.json'
        });
    }

    // Check privileges (for certification, should be minimal)
    if (capabilities.privileges) {
        const privs = capabilities.privileges;
        if (privs.some(p => p.name === 'WebAccess' && p.essential)) {
            checks.push({
                name: 'Web Access Privilege',
                status: 'warning',
                message: 'WebAccess privilege is enabled',
                recommendation: 'External web access may prevent certification. Remove if not needed.'
            });
        }
    }

    // Check supportsHighlight
    if (capabilities.supportsHighlight) {
        checks.push({
            name: 'Highlight Support',
            status: 'pass',
            message: 'Visual supports data highlighting'
        });
    }

    // Check supportsKeyboardFocus (accessibility)
    if (capabilities.supportsKeyboardFocus) {
        checks.push({
            name: 'Keyboard Focus Support',
            status: 'pass',
            message: 'Visual supports keyboard navigation (accessibility)'
        });
    } else {
        checks.push({
            name: 'Keyboard Focus Support',
            status: 'warning',
            message: 'Keyboard navigation not enabled',
            recommendation: 'Add "supportsKeyboardFocus": true for accessibility'
        });
    }

    return checks;
}

async function checkRenderingEvents(rootPath: string): Promise<CertificationCheck[]> {
    const checks: CertificationCheck[] = [];
    const srcPath = path.join(rootPath, 'src');

    if (!fs.existsSync(srcPath)) {
        checks.push({
            name: 'Rendering Events',
            status: 'fail',
            message: 'Cannot check — src/ folder not found'
        });
        return checks;
    }

    const sourceFiles = await getSourceFiles(srcPath);
    let allCode = '';
    for (const file of sourceFiles) {
        allCode += await fs.readFile(file, 'utf-8') + '\n';
    }

    const hasStarted = /renderingStarted/.test(allCode);
    const hasFinished = /renderingFinished/.test(allCode);
    const hasFailed = /renderingFailed/.test(allCode);

    if (hasStarted && hasFinished && hasFailed) {
        checks.push({
            name: 'Rendering Events',
            status: 'pass',
            message: 'All 3 rendering events implemented (renderingStarted, renderingFinished, renderingFailed)'
        });
    } else {
        const missing: string[] = [];
        if (!hasStarted) missing.push('renderingStarted');
        if (!hasFinished) missing.push('renderingFinished');
        if (!hasFailed) missing.push('renderingFailed');

        checks.push({
            name: 'Rendering Events',
            status: 'fail',
            message: `Missing rendering events: ${missing.join(', ')}`,
            recommendation: 'Rendering events are required for certification. Call host.eventService.renderingStarted(options) at the beginning of update(), renderingFinished(options) on success, and renderingFailed(options, error) on error.'
        });
    }

    return checks;
}

async function checkAssets(rootPath: string): Promise<CertificationCheck[]> {
    const checks: CertificationCheck[] = [];
    const assetsPath = path.join(rootPath, 'assets');

    if (!fs.existsSync(assetsPath)) {
        checks.push({
            name: 'Assets Folder',
            status: 'warning',
            message: 'Assets folder not found',
            recommendation: 'Create assets/ folder with icon.png (20x20)'
        });
        return checks;
    }

    const iconPath = path.join(assetsPath, 'icon.png');
    if (fs.existsSync(iconPath)) {
        checks.push({
            name: 'Visual Icon',
            status: 'pass',
            message: 'icon.png found in assets/'
        });
    } else {
        checks.push({
            name: 'Visual Icon',
            status: 'warning',
            message: 'icon.png not found',
            recommendation: 'Add icon.png (20x20 px) to assets/ folder'
        });
    }

    return checks;
}

function formatResults(checks: CertificationCheck[]): string {
    const passed = checks.filter(c => c.status === 'pass').length;
    const failed = checks.filter(c => c.status === 'fail').length;
    const warnings = checks.filter(c => c.status === 'warning').length;

    let output = `# 📋 Certification Readiness Report\n\n`;
    output += `| Status | Count |\n|--------|-------|\n`;
    output += `| ✅ Passed | ${passed} |\n`;
    output += `| ❌ Failed | ${failed} |\n`;
    output += `| ⚠️ Warnings | ${warnings} |\n\n`;

    if (failed === 0 && warnings === 0) {
        output += `## 🎉 Excellent! Your visual is ready for certification!\n\n`;
    } else if (failed === 0) {
        output += `## 👍 Good! Fix warnings for a better certification experience.\n\n`;
    } else {
        output += `## 🔧 Action Required: Fix failed checks before certification.\n\n`;
    }

    // Group by status
    if (failed > 0) {
        output += `## ❌ Failed Checks\n`;
        checks.filter(c => c.status === 'fail').forEach(c => {
            output += `- **${c.name}**: ${c.message}\n`;
            if (c.recommendation) output += `  💡 ${c.recommendation}\n`;
        });
        output += '\n';
    }

    if (warnings > 0) {
        output += `## ⚠️ Warnings\n`;
        checks.filter(c => c.status === 'warning').forEach(c => {
            output += `- **${c.name}**: ${c.message}\n`;
            if (c.recommendation) output += `  💡 ${c.recommendation}\n`;
        });
        output += '\n';
    }

    output += `## ✅ Passed Checks\n`;
    checks.filter(c => c.status === 'pass').forEach(c => {
        output += `- **${c.name}**: ${c.message}\n`;
    });

    output += `\n---\n`;
    output += `For certification: \`pbiviz package --certification-audit\`\n`;
    output += `Learn more: https://learn.microsoft.com/power-bi/developer/visuals/power-bi-custom-visuals-certified\n`;

    return output;
}

export async function prepareCertification(rootPath: string): Promise<string> {
    try {
        const fileChecks = await checkRequiredFiles(rootPath);
        const pbivizChecks = await checkPbivizConfig(rootPath);
        const capabilityChecks = await checkCapabilities(rootPath);
        const renderingChecks = await checkRenderingEvents(rootPath);
        const assetChecks = await checkAssets(rootPath);

        const allChecks = [...fileChecks, ...pbivizChecks, ...capabilityChecks, ...renderingChecks, ...assetChecks];

        return formatResults(allChecks);
    } catch (error) {
        return `❌ Error checking certification readiness: ${(error instanceof Error) ? error.message : String(error)}`;
    }
}

/*
 *  Power BI Visual CLI - MCP Server - Skills Tool
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 */

"use strict";

interface SkillInfo {
    id: string;
    path: string;
    version: string;
    description: string;
    minApiVersion?: string;
    tags?: string[];
    dependencies?: string[];
    files: string[];
    safe: boolean;
    scripts: boolean;
}

interface SkillsManifest {
    schemaVersion: number;
    repo: string;
    defaultTarget: string;
    defaultSkills: string[];
    skills: SkillInfo[];
}

const REPO_OWNER = "Demonkratiy";
const REPO_NAME = "powerbi-visuals-skills";
const BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

let cachedManifest: SkillsManifest | null = null;
let cachedManifestTimestamp = 0;
const MANIFEST_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Reset the manifest cache. Exported for test isolation. */
export function _resetCache(): void {
    cachedManifest = null;
    cachedManifestTimestamp = 0;
}

async function fetchRawFile(repoPath: string): Promise<string> {
    const url = `${RAW_BASE}/${repoPath}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    return res.text();
}

async function getManifest(): Promise<SkillsManifest> {
    const now = Date.now();
    if (cachedManifest && (now - cachedManifestTimestamp) < MANIFEST_TTL_MS) {
        return cachedManifest;
    }
    const raw = await fetchRawFile("skills.json");
    cachedManifest = JSON.parse(raw) as SkillsManifest;
    cachedManifestTimestamp = now;
    return cachedManifest;
}

function findSkill(manifest: SkillsManifest, skillName: string): SkillInfo | null {
    const lower = skillName.toLowerCase();
    return manifest.skills.find(s => s.id.toLowerCase() === lower) || null;
}

async function getAdditionalSkillFiles(
    skill: SkillInfo
): Promise<{ files: Array<{ filename: string; content: string }>; warnings: string[] }> {
    const files: Array<{ filename: string; content: string }> = [];
    const warnings: string[] = [];

    // The manifest declares every file in the skill directory, so we fetch each one
    // directly via raw.githubusercontent.com. No GitHub contents API call required.
    if (!Array.isArray(skill.files) || skill.files.length === 0) {
        warnings.push(
            `Skill "${skill.id}" manifest entry is missing a "files" array; no reference files will be loaded.`
        );
        return { files, warnings };
    }

    for (const filePath of skill.files) {
        if (filePath === "SKILL.md") continue;
        try {
            const content = await fetchRawFile(`${skill.path}/${filePath}`);
            files.push({ filename: filePath, content });
        } catch (err) {
            warnings.push(`Failed to fetch ${skill.path}/${filePath}: ${(err as Error).message}`);
        }
    }

    return { files, warnings };
}

export async function listAvailableSkills(): Promise<string> {
    try {
        const manifest = await getManifest();

        return JSON.stringify(
            {
                message: "Available Power BI Visual Skills",
                description:
                    "Each skill contains step-by-step instructions for implementing a feature. Use get_skill_instructions to get the full implementation guide for a specific skill.",
                skills: manifest.skills.map(s => ({
                    id: s.id,
                    description: s.description,
                    version: s.version,
                    tags: s.tags,
                    minApiVersion: s.minApiVersion
                }))
            },
            null,
            2
        );
    } catch (error) {
        return JSON.stringify(
            {
                message: "Failed to fetch skills from remote repository",
                error: (error as Error).message,
                skills: []
            },
            null,
            2
        );
    }
}

export async function getSkillInstructions(skillName: string): Promise<string> {
    const manifest = await getManifest();
    const skill = findSkill(manifest, skillName);

    if (!skill) {
        const available = manifest.skills.map(s => s.id);
        return JSON.stringify(
            {
                error: `Feature "${skillName}" not found.`,
                message: `Please pick a valid feature ID from the list below and call implement_feature again.`,
                availableFeatures: available,
                skills: manifest.skills.map(s => ({
                    id: s.id,
                    description: s.description,
                    version: s.version,
                    tags: s.tags,
                    minApiVersion: s.minApiVersion
                }))
            },
            null,
            2
        );
    }

    // Fetch SKILL.md from the remote repo
    const skillMdPath = `${skill.path}/SKILL.md`;
    const instructions = await fetchRawFile(skillMdPath);

    // Fetch additional reference files declared in the manifest
    const { files: additionalFiles, warnings } = await getAdditionalSkillFiles(skill);

    return JSON.stringify(
        {
            skillName: skill.id,
            description: skill.description,
            version: skill.version,
            instructions,
            additionalFiles: additionalFiles.length > 0 ? additionalFiles : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
            usage:
                "Follow the instructions in the 'instructions' field to implement this feature in the target visual project. The instructions contain all necessary code templates, configuration changes, and step-by-step guidance."
        },
        null,
        2
    );
}

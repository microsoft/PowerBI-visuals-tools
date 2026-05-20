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

interface GitHubContentEntry {
    name: string;
    path: string;
    type: "file" | "dir";
    download_url: string | null;
}

const REPO_OWNER = "Demonkratiy";
const REPO_NAME = "powerbi-visuals-skills";
const BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

let cachedManifest: SkillsManifest | null = null;

async function fetchRawFile(repoPath: string): Promise<string> {
    const url = `${RAW_BASE}/${repoPath}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    return res.text();
}

async function fetchDirListing(repoPath: string): Promise<GitHubContentEntry[]> {
    const url = `${API_BASE}/${repoPath}?ref=${BRANCH}`;
    const res = await fetch(url, {
        headers: { "Accept": "application/vnd.github.v3+json" }
    });
    if (!res.ok) {
        throw new Error(`Failed to list ${url}: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<GitHubContentEntry[]>;
}

async function getManifest(): Promise<SkillsManifest> {
    if (cachedManifest) return cachedManifest;
    const raw = await fetchRawFile("skills.json");
    cachedManifest = JSON.parse(raw) as SkillsManifest;
    return cachedManifest;
}

function findSkill(manifest: SkillsManifest, skillName: string): SkillInfo | null {
    const lower = skillName.toLowerCase();
    return manifest.skills.find(s => s.id.toLowerCase() === lower) || null;
}

async function collectFilesRecursively(dirPath: string): Promise<Array<{ filename: string; content: string }>> {
    const files: Array<{ filename: string; content: string }> = [];
    const entries = await fetchDirListing(dirPath);

    for (const entry of entries) {
        if (entry.type === "file" && entry.download_url) {
            const content = await fetchRawFile(entry.path);
            files.push({ filename: `${dirPath.split("/").pop()}/${entry.name}`, content });
        } else if (entry.type === "dir") {
            const subFiles = await collectFilesRecursively(entry.path);
            files.push(...subFiles);
        }
    }

    return files;
}

async function getAdditionalSkillFiles(skillPath: string): Promise<Array<{ filename: string; content: string }>> {
    const files: Array<{ filename: string; content: string }> = [];

    try {
        const entries = await fetchDirListing(skillPath);

        for (const entry of entries) {
            if (entry.name === "SKILL.md") continue;

            if (entry.type === "file" && entry.download_url) {
                const content = await fetchRawFile(entry.path);
                files.push({ filename: entry.name, content });
            } else if (entry.type === "dir") {
                const subFiles = await collectFilesRecursively(entry.path);
                files.push(...subFiles);
            }
        }
    } catch {
        // If listing fails (e.g., rate limit), return what we have
    }

    return files;
}

export async function listAvailableSkills(): Promise<string> {
    try {
        const manifest = await getManifest();

        return JSON.stringify({
            message: "Available Power BI Visual Skills",
            description: "Each skill contains step-by-step instructions for implementing a feature. Use get_skill_instructions to get the full implementation guide for a specific skill.",
            skills: manifest.skills.map(s => ({
                id: s.id,
                description: s.description,
                version: s.version,
                tags: s.tags,
                minApiVersion: s.minApiVersion
            }))
        }, null, 2);
    } catch (error) {
        return JSON.stringify({
            message: "Failed to fetch skills from remote repository",
            error: (error as Error).message,
            skills: []
        }, null, 2);
    }
}

export async function getSkillInstructions(skillName: string): Promise<string> {
    const manifest = await getManifest();
    const skill = findSkill(manifest, skillName);

    if (!skill) {
        const available = manifest.skills.map(s => s.id);
        return JSON.stringify({
            error: `Feature "${skillName}" not found.`,
            message: `Please pick a valid feature ID from the list below and call get_feature_documentation again.`,
            availableFeatures: available,
            skills: manifest.skills.map(s => ({
                id: s.id,
                description: s.description,
                version: s.version,
                tags: s.tags,
                minApiVersion: s.minApiVersion
            }))
        }, null, 2);
    }

    // Fetch SKILL.md from the remote repo
    const skillMdPath = `${skill.path}/SKILL.md`;
    const instructions = await fetchRawFile(skillMdPath);

    // Fetch additional reference files
    const additionalFiles = await getAdditionalSkillFiles(skill.path);

    return JSON.stringify({
        skillName: skill.id,
        description: skill.description,
        version: skill.version,
        instructions,
        additionalFiles: additionalFiles.length > 0 ? additionalFiles : undefined,
        usage: "Follow the instructions in the 'instructions' field to implement this feature in the target visual project. The instructions contain all necessary code templates, configuration changes, and step-by-step guidance."
    }, null, 2);
}

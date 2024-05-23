import { ESLint } from "eslint";
import fs from 'fs-extra';
import path from "path";

import ConsoleWriter from "./ConsoleWriter.js";
import { LintOptions } from "./VisualManager.js";
import { getRootPath } from "./utils.js";

export class LintValidator {

    private visualPath: string;
    private rootPath: string;
    private isVerboseMode: boolean;
    private useDefault: boolean;
    private shouldFix: boolean;
    private config: ESLint.Options;
    private linterInstance: ESLint;

    constructor({verbose, fix, useDefault}: LintOptions) {
        this.visualPath = process.cwd()
        this.rootPath = getRootPath();
        this.isVerboseMode = verbose;
        this.useDefault = useDefault;
        this.shouldFix = fix;

        this.prepareConfig();
        this.linterInstance = new ESLint(this.config);
    }

    /**
     * Runs lint validation in the visual folder
     */
    public async runLintValidation() {
        ConsoleWriter.info("Running lint check...");
        // By default it will lint all files in the src of current working directory, but some files can be excluded in .eslintignore
        const results = await this.linterInstance.lintFiles("src/");

        if (this.shouldFix) {
            await this.fixErrors(results);
        }
        await this.outputResults(results);
        ConsoleWriter.info("Lint check completed.");
    }
    
    private async fixErrors(results: ESLint.LintResult[]) {
        ConsoleWriter.info("Lint fixing errors...");
        await ESLint.outputFixes(results);
    }

    private async outputResults(results: ESLint.LintResult[]) {
        if (this.isVerboseMode) {
            const formatter = await this.linterInstance.loadFormatter("stylish");
            const formattedResults = await formatter.format(results);
            console.log(formattedResults)
        } else {
            const filteredResults = ESLint.getErrorResults(results);
            // get total amount of errors and warnings in all elements of filteredResults
            const totalErrors = filteredResults.reduce((acc, curr) => acc + curr.errorCount, 0);
            const totalWarnings = filteredResults.reduce((acc, curr) => acc + curr.warningCount, 0);
            if (totalErrors > 0 || totalWarnings > 0) {
                ConsoleWriter.error(`Linter found ${totalErrors} errors and ${totalWarnings} warnings. Run with --verbose flag to see details.`)
            }
        }   
    }

    private prepareConfig() {
        const requiredConfig = {
            extensions: [".js", ".jsx", ".ts", ".tsx"],
            fix: this.shouldFix,
            resolvePluginsRelativeTo: this.getPluginPath()
        }
        const eslintrcExtensions = ['.json', '.js', '.cjs', '.ts', '']
        if (!this.useDefault && eslintrcExtensions.some(el => fs.existsSync(path.join(this.visualPath, `.eslintrc${el}`)))) {
            this.config = requiredConfig
        } else {
            ConsoleWriter.warning("Using recommended eslint config.")
            this.config = {
                ...requiredConfig,
                overrideConfig: {
                    env: {
                        browser: true,
                        es6: true,
                        es2022: true
                    },
                    plugins: [
                        "powerbi-visuals"
                    ],
                    extends: [
                        "plugin:powerbi-visuals/recommended"
                    ]
                },
                useEslintrc: false,
            }
        }
    }

    private getPluginPath() {
        const pluginPaths = [
            path.resolve(this.visualPath, "node_modules", "eslint-plugin-powerbi-visuals"),
            path.resolve(this.rootPath, "node_modules", "eslint-plugin-powerbi-visuals")
        ]
        return pluginPaths.find(fs.existsSync)
    }
}
import { ESLint } from "eslint";

import ConsoleWriter from "./ConsoleWriter.js";
import { LintOptions } from "./VisualManager.js";
import { fileExists, getRootPath } from "./utils.js";

export class LintValidator {

    private visualPath: string;
    private rootPath: string;
    private config: ESLint.Options;
    private defaultConfig: ESLint.Options;
    private linterInstance: ESLint;

    constructor(fix: boolean = false) {
        this.visualPath = process.cwd()
        this.rootPath = getRootPath();
        this.prepareConfig(fix);
        this.linterInstance = new ESLint(this.config);
    }

    /**
     * Runs lint validation in the visual folder
     */
    public async runLintValidation({ verbose, fix }: LintOptions) {
        ConsoleWriter.info("Running lint check...");
        // By default it will lint all files in the src of current working directory, but some files can be excluded in .eslintignore
        const results = await this.linterInstance.lintFiles("src/**/*");

        if (fix) {
            await this.fixErrors(results);
        }
        await this.outputResults(results, verbose);
        ConsoleWriter.info("Lint check completed.");
    }
    
    private async fixErrors(results: ESLint.LintResult[]) {
        ConsoleWriter.info("Lint fixing errors...");
        await ESLint.outputFixes(results);
    }

    private async outputResults(results: ESLint.LintResult[], verbose: boolean) {
        if (verbose) {
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

    private prepareConfig(fix: boolean) {
        this.defaultConfig = {
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
            extensions: [".ts", ".tsx"],
            resolvePluginsRelativeTo: this.rootPath,
            useEslintrc: false,
            fix
        }

        const eslintrcExtensions = ['.json', '.js', '.ts']
        if (eslintrcExtensions.some(el => fileExists(this.visualPath, `.eslintrc${el}`))){
            this.config = { fix }
        } else {
            ConsoleWriter.warning("No .eslintrc file found in the visual folder. Using default config.")
            this.config = this.defaultConfig
        }
    }
}
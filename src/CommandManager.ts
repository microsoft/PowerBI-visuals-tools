
import { createCertificate } from './CertificateTools.js';
import ConsoleWriter from './ConsoleWriter.js';
import VisualManager, { GenerateOptions } from './VisualManager.js';
import { WebpackOptions } from './WebPackWrap.js';

export interface LintOptions {
    verbose: boolean;
    fix: boolean;
}

interface StartOptions {
    port: number;
    stats: boolean;
    drop: boolean;
    skipApi: boolean;
    allLocales: boolean;
    pbivizFile: string;
}

interface PackageOptions {
    pbiviz: boolean;
    resources: boolean;
    minify: boolean;
    compression: number;
    stats: boolean;
    skipApi: boolean;
    allLocales: boolean;
    verbose: boolean;
    fix: boolean;
    pbivizFile: string;
}

interface NewOptions {
    force: boolean;
    template: string;
}

export default class CommandManager {

    public static async start(options: StartOptions, rootPath: string) {
        const webpackOptions: WebpackOptions = {
            devMode: true,
            devtool: "source-map",
            generateResources: true,
            generatePbiviz: false,
            minifyJS: false,
            minify: false,
            devServerPort: options.port,
            stats: options.stats,
            skipApiCheck: options.skipApi,
            allLocales: options.allLocales,
            pbivizFile: options.pbivizFile,
        }
        const visualManager = new VisualManager(rootPath)
        await visualManager
            .prepareVisual(options.pbivizFile)
            .validateVisual()
            .initializeWebpack(webpackOptions)
        visualManager.startWebpackServer(options.drop)
    }
    
    public static async lint(options: LintOptions, rootPath: string) {
        const visualManager = new VisualManager(rootPath)
        await visualManager
            .prepareVisual()
            .runLintValidation(options)
    }

    public static async package(options: PackageOptions, rootPath: string) {
        if (!options.pbiviz && !options.resources) {
            ConsoleWriter.error('Nothing to build. Cannot use --no-pbiviz without --resources');
            process.exit(1);
        }
        
        const webpackOptions: WebpackOptions = {
            devMode: false,
            generateResources: options.resources,
            generatePbiviz: options.pbiviz,
            minifyJS: options.minify,
            minify: options.minify,
            compression: options.compression, 
            stats: options.stats,
            skipApiCheck: options.skipApi,
            allLocales: options.allLocales,
            pbivizFile: options.pbivizFile,
        }
        const lintOptions: LintOptions = {
            verbose: options.verbose,
            fix: options.fix,
        }
        const visual = new VisualManager(rootPath).prepareVisual(options.pbivizFile)
        await visual.runLintValidation(lintOptions)
        visual.validateVisual(options.verbose)
            .initializeWebpack(webpackOptions)
            .then(visualManager => visualManager.generatePackage(options.verbose))
    }

    public static new({ force, template }: NewOptions, name: string, rootPath: string) {
        const generateOptions: GenerateOptions = {
            force: force,
            template: template
        };
        VisualManager.createVisual(rootPath, name, generateOptions)
    }

    public static info(rootPath: string) {
        new VisualManager(rootPath)
            .prepareVisual()
            .displayInfo();
    }

    public static async installCert() {
        await createCertificate();
    }
}
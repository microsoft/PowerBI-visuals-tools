
import { createCertificate } from './CertificateTools.js';
import ConsoleWriter from './ConsoleWriter.js';
import VisualManager from './VisualManager.js';
import { WebpackOptions } from './WebPackWrap.js';

interface StartOptions {
    port: number,
    stats: boolean,
    drop: boolean
}

interface PackageOptions {
    pbiviz: boolean,
    resources: boolean,
    minify: boolean,
    compression: number,
    stats: boolean,
}

interface NewOptions {
    force: boolean,
    template: string
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
            stats: options.stats
        }
        const visualManager = new VisualManager(rootPath)
        await visualManager
            .prepareVisual()
            .initializeWebpack(webpackOptions)
        visualManager.startWebpackServer(options.drop)
    }

    public static async package(options: PackageOptions, rootPath: string) {
        if (!options.pbiviz && !options.resources) {
            ConsoleWriter.error('Nothing to build. Cannot use --no-pbiviz without --resources');
            process.exit(1);
        }
        
        const webpackOptions = {
            devMode: false,
            generateResources: options.resources,
            generatePbiviz: options.pbiviz,
            minifyJS: options.minify,
            minify: options.minify,
            compression: options.compression, 
            stats: options.stats
        }
        new VisualManager(rootPath)
            .prepareVisual()
            .initializeWebpack(webpackOptions)
            .then(visualManager => visualManager.generatePackage())
    }

    public static new({ force, template }: NewOptions, name: string, rootPath: string) {
        const generateOptions = {
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
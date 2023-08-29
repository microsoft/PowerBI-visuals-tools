import { compareVersions } from "compare-versions";
import { VisualFeatureType } from "./features/FeatureTypes.js";

export class Visual {
    public visualFeatureType: VisualFeatureType;
    private capabilities;
    private config;
    private packageJSON;
    private visualVersion: string;

    constructor(capabilities, config, packageJson) {
        this.capabilities = capabilities;
        this.config = config;
        this.visualFeatureType = this.getVisualFeatureType();
        this.packageJSON = packageJson;
        this.visualVersion = config.visual.version;
    }

    public doesAPIVersionMatch(minAPIversion: string) {
        return compareVersions(this.config.apiVersion ?? minAPIversion, minAPIversion) !== -1
    }

    public doesESLlintSupported() {
        return Object.entries(this.packageJSON.scripts).some(([, value]) => (<string>value).includes("eslint"))
    }

    public isVisualVersionValid(length: number) {
        return this.visualVersion.split(".").length === length
    }

    private getVisualFeatureType() {
        const isMatrixSupported = this.capabilities?.dataViewMappings?.some(dataView => dataView.matrix)
        const isSlicer = Boolean(this.capabilities?.objects?.general?.properties?.filter?.type?.filter)
        let type = isSlicer ? VisualFeatureType.Slicer : VisualFeatureType.NonSlicer;
        if (isMatrixSupported) {
            type = type | VisualFeatureType.Matrix;
        }
        return type;
    }
}
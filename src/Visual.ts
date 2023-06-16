import { compareVersions } from "compare-versions";
import { VisualType } from "./Features/FeatureTypes.js";

export class Visual {
    public visualType: VisualType;
    private capabilities;
    private config;
    private packageJSON;
    private visualVersion: string;

    constructor(capabilities, config, packageJson) {
        this.capabilities = capabilities;
        this.config = config;
        this.visualType = this.getVisualType();
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

    private getVisualType() {
        let type = VisualType.Default;
        if(this.capabilities?.dataViewMappings?.some(dataView => dataView.matrix)){
            type = VisualType.Matrix;
        } else if (this.capabilities?.objects?.general?.properties?.filter?.type?.filter) {
            type = VisualType.Slicer;
        }
        return type;
    }
}  
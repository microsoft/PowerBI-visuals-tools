import { compareVersions } from "compare-versions";
import { VisualFeatureType } from "./features/FeatureTypes.js";
export class Visual {
    visualFeatureType;
    capabilities;
    config;
    packageJSON;
    visualVersion;
    constructor(capabilities, config, packageJson) {
        this.capabilities = capabilities;
        this.config = config;
        this.visualFeatureType = this.getVisualFeatureType();
        this.packageJSON = packageJson;
        this.visualVersion = config.visual.version;
    }
    doesAPIVersionMatch(minAPIversion) {
        return compareVersions(this.config.apiVersion ?? minAPIversion, minAPIversion) !== -1;
    }
    doesESLlintSupported() {
        return Object.entries(this.packageJSON.scripts).some(([, value]) => value.includes("eslint"));
    }
    isVisualVersionValid(length) {
        return this.visualVersion.split(".").length === length;
    }
    getVisualFeatureType() {
        let type = VisualFeatureType.Default;
        const isMatrixSupported = this.capabilities?.dataViewMappings?.some(dataView => dataView.matrix);
        const isSlicer = Boolean(this.capabilities?.objects?.general?.properties?.filter?.type?.filter);
        if (isSlicer && isMatrixSupported) {
            type = VisualFeatureType.All;
        }
        else if (isSlicer) {
            type = VisualFeatureType.Slicer;
        }
        else if (isMatrixSupported) {
            type = VisualFeatureType.Matrix;
        }
        return type;
    }
}

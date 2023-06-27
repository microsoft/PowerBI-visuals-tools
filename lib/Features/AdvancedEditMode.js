import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class AdvancedEditMode {
    static featureName = "Advanced Edit Mode";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/advanced-edit-mode";
    static severity = Severity.Info;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return !packageInstance.capabilityEnabled({ advancedEditMode: 0 }); // 0 - Advanced edit mode is disabled
    }
}

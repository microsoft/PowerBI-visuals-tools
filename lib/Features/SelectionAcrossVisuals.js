import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class SelectionAcrossVisuals {
    static featureName = "Selection Across Visuals";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportsmultivisualselection-feature";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.Default;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.capabilityEnabled({ supportsMultiVisualSelection: true });
    }
}

import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class HighContrast {
    static featureName = "High Contrast";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/high-contrast-support";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain(".isHighContrast");
    }
}

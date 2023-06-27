import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class AllowInteractions {
    static featureName = "Allow Interactions";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/visuals-interactions";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain('.allowInteractions');
    }
}

import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class Tooltips {
    static featureName = "Tooltips";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-tooltips";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain("tooltipService") && packageInstance.capabilityEnabled({ tooltips: {} });
    }
}

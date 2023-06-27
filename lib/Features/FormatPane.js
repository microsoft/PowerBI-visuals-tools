import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class FormatPane {
    static featureName = "Format Pane";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/format-pane";
    static severity = Severity.Deprecation;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain("getFormattingModel");
    }
}

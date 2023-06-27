import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class Bookmarks {
    static featureName = "Bookmarks";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/bookmarks-support";
    static severity = Severity.Info;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.Slicer;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain("applySelectionFromFilter") || packageInstance.contain("registerOnSelectCallback");
    }
}

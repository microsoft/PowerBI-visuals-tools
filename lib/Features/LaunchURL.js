import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class LaunchURL {
    static featureName = "Launch URL";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/launch-url";
    static severity = Severity.Info;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain(".launchUrl");
    }
}

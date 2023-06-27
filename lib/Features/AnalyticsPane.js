import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class AnalyticsPane {
    static featureName = "Analytics Pane";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/analytics-pane";
    static severity = Severity.Info;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return (packageInstance.capabilityEnabled({
            objects: {
                objectCategory: 2
            }
        }) ||
            packageInstance.contain("analyticsPane=true"));
    }
}

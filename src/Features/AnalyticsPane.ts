import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class AnalyticsPane implements BaseFeature {
    public static featureName = "Analytics Pane"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/analytics-pane"
    public static severity = Severity.Info
    public static stage = Stage.PostBuild
    public static visualType = VisualType.All
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {  // TBD: old api
        return packageInstance.capabilityEnabled({
            objects: {
                objectCategory: 2
            }
        })
    }
}
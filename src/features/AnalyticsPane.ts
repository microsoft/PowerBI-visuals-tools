import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class AnalyticsPane implements BaseFeature {
    public static featureName = "Analytics Pane"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/analytics-pane"
    public static severity = Severity.Info
    public static stage = Stage.PostBuild
    public static visualFeatureType = VisualFeatureType.Default

    static isSupported(packageInstance: Package) {
        return (
            packageInstance.isCapabilityEnabled({
                objects: {
                    objectCategory: 2
                }
            }) ||
            packageInstance.contain("analyticsPane=true")
        )
    }
}
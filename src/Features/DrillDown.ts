import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class DrillDown implements BaseFeature {
    public static featureName = "Drill Down"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/drill-down-support"
    public static severity = Severity.Info
    public static stage = Stage.PostBuild
    public static visualType = VisualType.Matrix
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.capabilityEnabled({ 
            drilldown: { 
                roles: [] 
            }
        })
    }
} 
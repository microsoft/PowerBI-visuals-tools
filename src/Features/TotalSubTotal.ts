import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class TotalSubTotal implements BaseFeature {
    public static featureName = "Total SubTotal"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/total-subtotal-api"
    public static severity = Severity.Warning
    public static stage = Stage.PostBuild
    public static visualType = VisualType.Matrix
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.capabilityEnabled({ subtotals: true })
    }
} 
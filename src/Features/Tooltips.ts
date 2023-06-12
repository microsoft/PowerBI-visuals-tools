import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class Tooltips implements BaseFeature {
    public static featureName = "Tooltips"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-tooltips"
    public static severity = Severity.Warning
    public static stage = Stage.PostBuild
    public static visualType = VisualType.All
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.contain("tooltipService") && packageInstance.capabilityEnabled({tooltips: {}})
    }
} 
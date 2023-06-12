import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class SelectionAcrossVisuals implements BaseFeature {
    public static featureName = "Selection Across Visuals"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportsmultivisualselection-feature"
    public static severity = Severity.Warning
    public static stage = Stage.PostBuild
    public static visualType = VisualType.Default
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.capabilityEnabled({ supportsMultiVisualSelection: true })
    }
} 
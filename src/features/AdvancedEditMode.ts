import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class AdvancedEditMode implements BaseFeature {
    public static featureName = "Advanced Edit Mode"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/advanced-edit-mode"
    public static severity = Severity.Info
    public static stage = Stage.PostBuild
    public static visualFeatureType = VisualFeatureType.Default
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return !packageInstance.isCapabilityEnabled({ advancedEditMode: 0 }) // 0 - Advanced edit mode is disabled
    }
} 
import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class FormatPane implements BaseFeature {
    public static featureName = "Format Pane"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/format-pane"
    public static severity = Severity.Deprecation
    public static stage = Stage.PostBuild
    public static visualType = VisualType.All
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.contain("getFormattingModel")
    }
} 
import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class Bookmarks implements BaseFeature {
    public static featureName = "Bookmarks"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/bookmarks-support"
    public static severity = Severity.Info
    public static stage = Stage.PostBuild
    public static visualType = VisualType.Slicer
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.contain("applySelectionFromFilter") || packageInstance.contain("registerOnSelectCallback")
    }
} 
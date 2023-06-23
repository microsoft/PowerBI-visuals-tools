import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class ColorPalette implements BaseFeature {
    public static featureName = "Color Palette"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-colors-power-bi-visual"
    public static severity = Severity.Warning
    public static stage = Stage.PostBuild
    public static visualFeatureType = VisualFeatureType.All
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.contain(".colorPalette")
    }
} 
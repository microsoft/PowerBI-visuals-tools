import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class ContextMenu implements BaseFeature {
    public static featureName = "Context Menu"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/context-menu"
    public static severity = Severity.Info
    public static stage = Stage.PostBuild
    public static visualFeatureType = VisualFeatureType.Default

    static isSupported(packageInstance: Package) {
        return packageInstance.contain(".showContextMenu")
    }
} 
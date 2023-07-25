import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class AllowInteractions implements BaseFeature {
    public static featureName = "Allow Interactions"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/visuals-interactions"
    public static severity = Severity.Warning
    public static stage = Stage.PostBuild
    public static visualFeatureType = VisualFeatureType.NonSlicer | VisualFeatureType.Slicer

    static isSupported(packageInstance: Package) {
        return packageInstance.contain('.allowInteractions')
    }
}
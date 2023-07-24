import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class KeyboardNavigation implements BaseFeature {
    public static featureName = "Keyboard Navigation"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportskeyboardfocus-feature"
    public static severity = Severity.Warning
    public static stage = Stage.PostBuild
    public static visualFeatureType = VisualFeatureType.Default 

    static isSupported(packageInstance: Package) {
        return packageInstance.isCapabilityEnabled({ supportsKeyboardFocus: true })
    }
} 
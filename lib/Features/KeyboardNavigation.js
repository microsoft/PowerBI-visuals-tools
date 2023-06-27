import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class KeyboardNavigation {
    static featureName = "Keyboard Navigation";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportskeyboardfocus-feature";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.capabilityEnabled({ supportsKeyboardFocus: true });
    }
}

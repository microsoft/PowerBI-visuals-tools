import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class ConditionalFormatting {
    static featureName = "Conditional Formatting";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/conditional-format";
    static severity = Severity.Info;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain(".createDataViewWildcardSelector");
    }
}

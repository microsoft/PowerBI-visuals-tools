import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class Localizations {
    static featureName = "Localizations";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/localization";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain(".createLocalizationManager");
    }
}

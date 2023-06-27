import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class LocalStorage {
    static featureName = "Local Storage";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/local-storage";
    static severity = Severity.Info;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain(".storageService");
    }
}

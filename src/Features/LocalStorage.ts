import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class LocalStorage implements BaseFeature {
    public static featureName = "Local Storage"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/local-storage"
    public static severity = Severity.Info
    public static stage = Stage.PostBuild
    public static visualType = VisualType.All
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.contain(".storageService")
    }
} 
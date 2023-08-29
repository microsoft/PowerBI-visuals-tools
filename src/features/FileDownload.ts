import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class FileDownload implements BaseFeature {
    public static featureName = "File Download"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/file-download-api"
    public static severity = Severity.Info
    public static stage = Stage.PostBuild
    public static visualFeatureType = VisualFeatureType.NonSlicer | VisualFeatureType.Slicer
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.contain(".downloadService") && packageInstance.contain(".exportVisualsContent")
    }
} 
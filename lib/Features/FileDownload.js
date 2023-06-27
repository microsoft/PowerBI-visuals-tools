import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class FileDownload {
    static featureName = "File Download";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/file-download-api";
    static severity = Severity.Info;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.contain(".downloadService") && packageInstance.contain(".exportVisualsContent");
    }
}

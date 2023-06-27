import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class SyncSlicer {
    static featureName = "Sync Slicer";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/enable-sync-slicers";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.Slicer;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.capabilityEnabled({ supportsSynchronizingFilterState: true });
    }
}

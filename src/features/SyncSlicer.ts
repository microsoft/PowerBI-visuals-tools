import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class SyncSlicer implements BaseFeature {
    public static featureName = "Sync Slicer"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/enable-sync-slicers"
    public static severity = Severity.Warning
    public static stage = Stage.PostBuild
    public static visualFeatureType = VisualFeatureType.Slicer
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(packageInstance: Package) {
        return packageInstance.capabilityEnabled({ supportsSynchronizingFilterState: true })
    }
} 
import Package from "../Package.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class FetchMoreData implements BaseFeature {
    public static featureName = "Fetch More Data"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/fetch-more-data"
    public static severity = Severity.Info
    public static stage = Stage.PostBuild
    public static visualFeatureType = VisualFeatureType.Default

    static isSupported(packageInstance: Package) {
        return packageInstance.isCapabilityEnabled({
            dataViewMappings: [
                {
                    table: {
                        rows: {
                            dataReductionAlgorithm: {}
                        }
                    }
                }
            ]
        })
    }
} 
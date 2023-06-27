import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class DrillDown {
    static featureName = "Drill Down";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/drill-down-support";
    static severity = Severity.Info;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.Matrix;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.capabilityEnabled({
            drilldown: {
                roles: []
            }
        });
    }
}

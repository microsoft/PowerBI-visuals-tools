import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class TotalSubTotal {
    static featureName = "Total SubTotal";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/total-subtotal-api";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.Matrix;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.capabilityEnabled({ subtotals: true });
    }
}

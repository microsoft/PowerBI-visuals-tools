import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class VisualVersion {
    static featureName = "Visual version";
    static expectedVersionLength = 4;
    static errorMessage = `${this.featureName} should consist of ${this.expectedVersionLength} parts. Update the pbiviz.json file`;
    static severity = Severity.Error;
    static stage = Stage.PreBuild;
    static visualFeatureType = VisualFeatureType.Default;
    static isSupported(visual) {
        return visual.isVisualVersionValid(this.expectedVersionLength);
    }
}

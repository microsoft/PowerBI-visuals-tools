import { Visual } from "../Visual.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class VisualVersion implements BaseFeature {
    public static featureName = "Visual version"
    public static expectedVersionLength = 4;
    public static errorMessage = `${this.featureName} should consist of ${this.expectedVersionLength} parts. Update the pbiviz.json file`;
    public static severity = Severity.Error
    public static stage = Stage.PreBuild
    public static visualFeatureType = VisualFeatureType.All

    static isSupported(visual: Visual) {
        return visual.isVisualVersionValid(this.expectedVersionLength)
    }
}
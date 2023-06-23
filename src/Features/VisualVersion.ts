import { Visual } from "../Visual.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class VisualVersion implements BaseFeature {
    public static featureName = "Visual version"
    public static expectedVersionLength = 4;
    public static errorMessage = `${this.featureName} should consist of ${this.expectedVersionLength} parts. Update your pbiviz.json file`;
    public static severity = Severity.Error
    public static stage = Stage.PreBuild
    public static visualFeatureType = VisualFeatureType.Default

    static isSupported(visual: Visual) {
        return visual.isVisualVersionValid(this.expectedVersionLength)
    }
}
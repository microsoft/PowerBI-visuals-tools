import { Visual } from "../Visual.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class VisualVersionLeadingZeros implements BaseFeature {
    public static featureName = "Visual version leading zeros"
    public static errorMessage = `${this.featureName} - version parts must not contain leading zeros (e.g. use 1.2.3.4 instead of 1.2.03.4). Update the pbiviz.json file. Versions with leading zeros are rejected by the Power BI marketplace package acceptance check.`
    public static severity = Severity.Error
    public static stage = Stage.PreBuild
    public static visualFeatureType = VisualFeatureType.All
    public static certificationRequired = true

    static isSupported(visual: Visual) {
        return !visual.hasVisualVersionLeadingZeros()
    }
}

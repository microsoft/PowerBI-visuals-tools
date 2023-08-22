import { Visual } from "../Visual.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class ESLint implements BaseFeature {
    public static featureName = "ESLint"
    public static documentationLink = "https://github.com/microsoft/eslint-plugin-powerbi-visuals";
    public static severity = Severity.Error
    public static stage = Stage.PreBuild
    public static visualFeatureType = VisualFeatureType.All
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`

    static isSupported(visual: Visual) {
        return visual.doesESLlintSupported()
    }
}
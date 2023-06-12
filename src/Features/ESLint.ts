import { Visual } from "../Visual.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class ESLint implements BaseFeature {
    public static featureName = "ESLint"
    public static documentationLink = "https://github.com/microsoft/eslint-plugin-powerbi-visuals";
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    public static severity = Severity.Error
    public static stage = Stage.PreBuild
    public static visualType = VisualType.Default

    static isSupported(visual: Visual) {
        return visual.doesESLlintSupported()
    }
}
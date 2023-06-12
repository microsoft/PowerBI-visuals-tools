import { Visual } from "../Visual.js";
import { readJsonFromRoot } from "../utils.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualType } from "./FeatureTypes.js";

export default class APIVersion implements BaseFeature {
    public static featureName = "Api"
    public static severity = Severity.Error
    public static stage = Stage.PreBuild
    public static visualType = VisualType.Default
    public static minAPIversion: string;
    public static errorMessage: string;

    static isSupported(visual: Visual) {
        const globalConfig = readJsonFromRoot('config.json');
        this.minAPIversion = globalConfig.constants.minAPIversion;
        this.errorMessage = `API version must be at least ${this.minAPIversion}.`
        return visual.doesAPIVersionMatch(this.minAPIversion)
    }
}
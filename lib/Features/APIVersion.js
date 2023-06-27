import { readJsonFromRoot } from "../utils.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class APIVersion {
    static featureName = "Api";
    static severity = Severity.Error;
    static stage = Stage.PreBuild;
    static visualFeatureType = VisualFeatureType.Default;
    static minAPIversion;
    static errorMessage;
    static isSupported(visual) {
        const globalConfig = readJsonFromRoot('config.json');
        this.minAPIversion = globalConfig.constants.minAPIversion;
        this.errorMessage = `API version must be at least ${this.minAPIversion}.`;
        return visual.doesAPIVersionMatch(this.minAPIversion);
    }
}

import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class ESLint {
    static featureName = "ESLint";
    static documentationLink = "https://github.com/microsoft/eslint-plugin-powerbi-visuals";
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static severity = Severity.Error;
    static stage = Stage.PreBuild;
    static visualFeatureType = VisualFeatureType.Default;
    static isSupported(visual) {
        return visual.doesESLlintSupported();
    }
}

import Package from "../Package.js";
import { Visual } from "../Visual.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default abstract class BaseFeature {
    public static severity: Severity
    public static stage: Stage
    public static visualFeatureType: VisualFeatureType
    public static featureName: string
    public static documentationLink: string
    public static errorMessage: string

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static isSupported(source: Visual | Package) {}
}

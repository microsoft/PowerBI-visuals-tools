import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class LandingPage {
    static featureName = "Landing Page";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/landing-page";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        return packageInstance.capabilityEnabled({ supportsLandingPage: true });
    }
}

import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";
export default class RenderingEvents {
    static featureName = "Rendering Events";
    static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/event-service";
    static severity = Severity.Warning;
    static stage = Stage.PostBuild;
    static visualFeatureType = VisualFeatureType.All;
    static errorMessage = `${this.featureName} - ${this.documentationLink}`;
    static isSupported(packageInstance) {
        const keywords = [".eventService", ".renderingStarted", ".renderingFinished"];
        return !keywords.some(keyword => !packageInstance.contain(keyword));
    }
}

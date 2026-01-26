import { Visual } from "../Visual.js";
import BaseFeature from "./BaseFeature.js";
import { Severity, Stage, VisualFeatureType } from "./FeatureTypes.js";

export default class AuthorInfo implements BaseFeature {
    public static featureName = "Author information"
    public static documentationLink = "https://learn.microsoft.com/en-us/power-bi/developer/visuals/visual-project-structure#metadata-entries"
    public static errorMessage = `${this.featureName} - ${this.documentationLink}`
    public static severity = Severity.Error
    public static stage = Stage.PreBuild
    public static visualFeatureType = VisualFeatureType.All

    static isSupported(visual: Visual) {
        return visual.isAuthorDefined()
    }
}

// The pbiviz.json schema validates author.name and author.email when present,
// but doesn't require the author object itself. This check fills that gap.
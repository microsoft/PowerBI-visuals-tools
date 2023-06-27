export var Severity;
(function (Severity) {
    Severity["Error"] = "error";
    Severity["Deprecation"] = "deprecation";
    Severity["Warning"] = "warning";
    Severity["Info"] = "info";
})(Severity || (Severity = {}));
export var Stage;
(function (Stage) {
    Stage["PreBuild"] = "pre-build";
    Stage["PostBuild"] = "post-build";
})(Stage || (Stage = {}));
const DEFAULT = 1;
const SLICER = 2;
const MATRIX = 4;
export var VisualFeatureType;
(function (VisualFeatureType) {
    VisualFeatureType[VisualFeatureType["Default"] = DEFAULT] = "Default";
    VisualFeatureType[VisualFeatureType["Slicer"] = SLICER | MATRIX] = "Slicer";
    VisualFeatureType[VisualFeatureType["Matrix"] = DEFAULT | MATRIX] = "Matrix";
    VisualFeatureType[VisualFeatureType["All"] = SLICER | DEFAULT | MATRIX] = "All";
})(VisualFeatureType || (VisualFeatureType = {}));
// Interaction types: Selection or filter (slicer)
// Slicer type: Basic, Advanced, Tuple filter, Identity filter
// Visual Type: TS/JS or R-Visual or RHTML
// Dataview Type: Single or Matrix or Table or Category or All

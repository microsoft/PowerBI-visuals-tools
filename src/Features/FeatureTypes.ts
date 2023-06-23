export enum Severity {
    Error = "error",
    Deprecation = "deprecation",
    Warning = "warning",
    Info = "info",
}

export enum Stage {
    PreBuild = "pre-build",
    PostBuild = "post-build",
}

const DEFAULT = 1;
const SLICER = 2;
const MATRIX = 4;

export enum VisualFeatureType {
    Default = DEFAULT,
    Slicer = SLICER | MATRIX,
    Matrix = DEFAULT | MATRIX,
    All = SLICER | DEFAULT | MATRIX,
}

// Interaction types: Selection or filter (slicer)
// Slicer type: Basic, Advanced, Tuple filter, Identity filter

// Visual Type: TS/JS or R-Visual or RHTML
// Dataview Type: Single or Matrix or Table or Category or All
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

export enum VisualFeatureType {
    NonSlicer = 1 << 1,
    Slicer = 1 << 2,
    Matrix = 1 << 3,
    All = NonSlicer | Slicer | Matrix
}

// Interaction types: Selection or filter (slicer)
// Slicer type: Basic, Advanced, Tuple filter, Identity filter

// Visual Type: TS/JS or R-Visual or RHTML
// Dataview Type: Single or Matrix or Table or Category or All
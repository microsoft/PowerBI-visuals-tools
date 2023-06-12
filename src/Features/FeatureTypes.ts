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

export enum VisualType {
    Default = DEFAULT,
    Slicer = SLICER,
    Matrix = DEFAULT | MATRIX,
    All = SLICER | DEFAULT | MATRIX,
}
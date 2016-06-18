module powerbi.extensibility.visual {

    export interface VisualDataPoint {
        value: number;
        color: string;
        identity: ISelectionId;
    }

    export interface VisualViewModel {
        dataPoints: VisualDataPoint[];
        min: number;
        max: number;
    }
}
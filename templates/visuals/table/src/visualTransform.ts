"use strict";
import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import DataViewCategorical = powerbi.DataViewCategorical;
import DataViewValueColumns = powerbi.DataViewValueColumns;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import { VisualViewModel } from "./visualViewModel";
export function visualTransform(dataViews: DataView[]): VisualViewModel {
    const viewModel: VisualViewModel = {
        categories: [],
        values: []
    };
    if (dataViews && dataViews[0]) {
        const dataView: DataView = dataViews[0];
        const categorical: DataViewCategorical = dataView.categorical;
        if (categorical) {
            const categories: DataViewCategoryColumn[] = categorical.categories;
            const series: DataViewValueColumns = categorical.values;

            if (categories && series && categories.length > 0 && series.length > 0) {
                for (let i: number = 0, catLength: number = categories[0].values.length; i < catLength; i++) {
                    viewModel.categories.push({
                        color: "white",
                        value: <string>categories[0].values[i],
                        identity: ""
                    });

                    for (let k: number = 0, seriesLength: number = series.length; k < seriesLength; k++) {
                        let value: any = series[k].values[i];
                        if (k === 0) {
                            viewModel.values.push({ values: [] });
                        }
                        viewModel.values[i].values.push(value);
                    }
                }
            }
        }
    }
    return viewModel;
}
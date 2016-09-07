module powerbi.extensibility.visual {

    export function visualTransform(dataViews: DataView[]): VisualViewModel {
        let viewModel: VisualViewModel = {
            categories: [],
            values: []
        }
        if (dataViews && dataViews[0]) {
            let dataView = dataViews[0];
            let categorical = dataView.categorical;
            if (categorical) {
                let categories = categorical.categories;
                let series = categorical.values;
                let formatString = dataView.metadata.columns[0].format;

                if (categories && series && categories.length > 0 && series.length > 0) {
                    for (let i = 0, catLength = categories[0].values.length; i < catLength; i++) {
                        viewModel.categories.push({
                            color: 'white',
                            value: <string>categories[0].values[i],
                            identity: ''
                        })

                        for (let k = 0, seriesLength = series.length; k < seriesLength; k++) {
                            let value = series[k].values[i];
                            if (k == 0) {
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
}
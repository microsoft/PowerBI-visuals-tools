module powerbi.extensibility.visual {

    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

    export function visualTransform(dataViews: DataView[]): VisualViewModel {
        if (!dataViews || !dataViews[0]) return;

        let values = dataViews[0].categorical.values;
        let valueCount = values.length;
        let dataPoints: VisualDataPoint[] = [];
        let i = 0;

        while (true) {
            let anyValues = false;
            for (let j = 0; j < valueCount; j++) {
                let value = values[j].values[i];
                if (value !== undefined) anyValues = true;

                dataPoints.push({
                    value: parseFloat(value) || 0,
                    color: colors[j],
                    identity: null
                });

            }
            if (!anyValues) break;
            i++;
        }

        let minTotal = values.reduce((last, v) => Math.min(<number>v.minLocal || 0, last), Infinity);
        let maxTotal = values.reduce((last, v) => Math.max(<number>v.maxLocal || 0, last), -Infinity);

        return {
            dataPoints: dataPoints,
            min: minTotal,
            max: maxTotal
        };
    }
}
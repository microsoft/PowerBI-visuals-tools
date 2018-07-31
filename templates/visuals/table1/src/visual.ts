/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */
module powerbi.extensibility.visual {
    "use strict";
    @VisualPlugin({
        transform: visualTransform
    })
    export class Visual implements IVisual {
        private target: d3.Selection<HTMLElement>;
        private table: d3.Selection<HTMLElement>;
        private tHead: d3.Selection<HTMLElement>;
        private tBody: d3.Selection<HTMLElement>;
        private settings: VisualSettings;

        constructor(options: VisualConstructorOptions) {
            let target: d3.Selection<HTMLElement> = this.target = d3.select(options.element).append("div")
                .classed("powerbi-demo-wrapper", true);

            let table: d3.Selection<HTMLElement> = this.table = target.append("table")
                .classed("powerbi-demo-table", true);

            this.tHead = table.append("thead").append("tr");
            this.tBody = table.append("tbody");
        }

        public update(options: VisualUpdateOptions, viewModel: VisualViewModel): void {
            if (!viewModel) {
                return;
            }
            this.settings = Visual.parseSettings(options.dataViews[0]);
            this.updateContainerViewports(options.viewport);

            let transposedSeries: any[][] = d3.transpose(viewModel.values.map((d: any) => d.values.map((d: any) => d)));
            let thSelection: d3.selection.Update<CategoryViewModel> = this.tHead.selectAll("th").data(viewModel.categories);
            thSelection.enter().append("th");
            thSelection.text((d: CategoryViewModel) => d.value);
            thSelection.exit().remove();

            let trSelection: d3.selection.Update<any[]> = this.tBody.selectAll("tr").data(transposedSeries);
            let tr: d3.Selection<any[]> = trSelection.enter().append("tr");
            tr.selectAll("td").data((d: any) => d).enter().append("td")
                .attr("data-th", (d: any, i: number) => viewModel.categories[i].value)
                .text((d: number) => this.format(d));

            trSelection.exit().remove();
        }

        private updateContainerViewports(viewport: IViewport): void {
            if (!viewport) {
                return;
            }
            const width: number = viewport.width;
            this.tHead.classed("dynamic", width > 400);
            this.table.attr("width", width);
        }

        private format(d: number): string {
            let prefix: d3.FormatPrefix = d3.formatPrefix(d);
            return d3.round(prefix.scale(d), 2) + " " + prefix.symbol;
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions):
            VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }
    }
}
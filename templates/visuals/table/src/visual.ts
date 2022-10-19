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

"use strict";

import { transpose } from "d3-array";
import { formatPrefix } from "d3-format";
import { select } from "d3-selection";
import "./../style/visual.less";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;

import { VisualFormattingSettingsModel } from "./settings";
import { visualTransform } from "./visualTransform";
import { CategoryViewModel, VisualViewModel } from "./visualViewModel";

"use strict";
export class Visual implements IVisual {
    private target: d3.Selection<any, any, any, any>;
    private table: d3.Selection<any, any, any, any>;
    private tHead: d3.Selection<any, any, any, any>;
    private tBody: d3.Selection<any, any, any, any>;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();

        let target: d3.Selection<any, any, any, any> = this.target = select(options.element).append("div")
            .classed("powerbi-demo-wrapper", true);

        let table: d3.Selection<any, any, any, any> = this.table = target.append("table")
            .classed("powerbi-demo-table", true);

        this.tHead = table.append("thead").append("tr");
        this.tBody = table.append("tbody");
    }

    public update(options: VisualUpdateOptions): void {
        this.updateInternal(options, visualTransform(options.dataViews));
    }

    public updateInternal(options: VisualUpdateOptions, viewModel: VisualViewModel): void {
        if (!viewModel) {
            return;
        }

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);
        this.updateContainerViewports(options.viewport);

        let transposedSeries: any[][] = transpose(viewModel.values.map((d: any) => d.values.map((d: any) => d)));
        let thSelection: d3.Selection<any, any, any, any> = this.tHead.selectAll("th").data(viewModel.categories);
        thSelection.enter().append("th");
        thSelection.text((d: CategoryViewModel) => d.value);
        thSelection.exit().remove();

        let trSelection: d3.Selection<any, any, any, any> = this.tBody.selectAll("tr").data(transposedSeries);
        let tr: d3.Selection<any, any, any, any> = trSelection.enter().append("tr");
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

    private round(x, n) {
        return n == null ? Math.round(x) : Math.round(x * (n = Math.pow(10, n))) / n;
    }

    private format(d: number): string {
        return formatPrefix("d", this.round(d, 2))(d);
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
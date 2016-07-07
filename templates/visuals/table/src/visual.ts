module powerbi.extensibility.visual {

    @VisualPlugin({
        transform: visualTransform
    })
    export class Visual implements IVisual {
        private target: d3.Selection<HTMLElement>;
        private table: d3.Selection<HTMLElement>;
        private tHead: d3.Selection<HTMLElement>;
        private tBody: d3.Selection<HTMLElement>;

        constructor(options: VisualConstructorOptions) {
            let target = this.target = d3.select(options.element).append('div')
                .classed('powerbi-demo-wrapper', true);

            let table = this.table = target.append('table')
                .classed('powerbi-demo-table', true);

            this.tHead = table.append('thead').append('tr');
            this.tBody = table.append('tbody');
        }

        public update(options: VisualUpdateOptions, viewModel: VisualViewModel) {
            if (!viewModel) return;

            this.updateContainerViewports(options.viewport);

            let transposedSeries = d3.transpose(viewModel.values.map(d => d.values.map(d => d)));
            let thSelection = this.tHead.selectAll('th').data(viewModel.categories);
            let th = thSelection.enter().append('th');

            thSelection.text(d => d.value);

            thSelection.exit().remove();

            let trSelection = this.tBody.selectAll('tr').data(transposedSeries);

            let tr = trSelection.enter().append('tr');

            tr.selectAll('td').data(d => d).enter().append('td')
                .attr('data-th', (d, i) => viewModel.categories[i].value)
                .text(d => this.format(<number>d));

            trSelection.exit().remove();
        }

        public destroy() {
            //TODO: handle any cleanup here
        }

        private updateContainerViewports(viewport: IViewport) {
            if (!viewport) return;
            let width = viewport.width;
            let height = viewport.height;

            this.tHead.classed('dynamic', width > 400);
            this.tBody.classed('dynamic', width > 400);

            this.table.attr('width', width);
        }

        private format(d: number) {
            let prefix = d3.formatPrefix(d);
            return d3.round(prefix.scale(d), 2) + ' ' + prefix.symbol
        }
    }
}
module powerbi.extensibility.visual {

    @VisualPlugin({
        transform: visualTransform
    })
    export class Visual implements IVisual {
        private target: d3.Selection<SVGElement>;
        private svg: d3.Selection<SVGElement>;
        private yAxis: d3.Selection<SVGElement>;

        constructor(options: VisualConstructorOptions) {
            let target = this.target = d3.select(options.element).append('div').classed('wrapper', true);
            let svg = this.svg = target.append('svg');
            this.yAxis = svg.append('g');
        }

        public update(options: VisualUpdateOptions, viewModel: VisualViewModel): void {
            if (!viewModel) return;

            const paddingX = 50;
            const paddingY = 20;

            let animationDuration = options.type & VisualUpdateType.Resize ? 0 : 500;
            let viewport = options.viewport;

            this.svg.attr({
                width: viewModel.dataPoints.length * 20,
                height: viewport.height
            });

            let yScale = d3.scale.linear()
                .domain([viewModel.min, viewModel.max])
                .range([viewport.height - paddingY, 0]);

            let yAxis = d3.svg.axis().orient('left').scale(yScale);
            this.yAxis.attr({
                transform: "translate(" + paddingX + ",0)"
            }).call(yAxis);

            let selection = this.svg.selectAll('.bar').data(viewModel.dataPoints);

            selection.enter().append('rect')
                .classed('bar', true)
                .attr({
                    height: 0,
                    y: viewport.height - paddingY
                });

            selection.attr({ fill: (d, i) => d.color })
                .transition()
                .duration(animationDuration)
                .attr({
                    x: (d, i) => i * 20 + paddingX,
                    y: (d, i) => yScale(d.value) || 0,
                    width: 15,
                    height: (d, i) => viewport.height - paddingY - (yScale(d.value) || 0)
                });

            selection.exit()
                .transition()
                .duration(animationDuration)
                .attr({ height: 0, y: viewport.height })
                .remove();
        }

        public destroy(): void {
            //TODO: Perform any cleanup tasks here
        }
    }
}
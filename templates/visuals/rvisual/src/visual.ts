module powerbi.extensibility.visual {

    export interface ScriptResult {
        source: string;
        provider: string;
    }
    
    export class Visual implements IVisual {
        private imageDiv: d3.Selection<HTMLElement>;
        private imageElement: d3.Selection<HTMLElement>;

        public constructor(options: VisualConstructorOptions) {
            let imageDiv = this.imageDiv = d3.select(options.element).append('div')
                .classed('rcv_autoScaleImageContainer', true);

            let imageElement = this.imageElement = imageDiv.append('img')
                .classed('rcv_autoScaleImage', true);
        }

        public update(options: VisualUpdateOptions) {
            let dataViews: DataView[] = options.dataViews;
            if (!dataViews || dataViews.length === 0)
                return;

            let dataView: DataView = dataViews[0];
            if (!dataView || !dataView.metadata)
                return;

            let imageUrl: string = null;
            if (dataView.scriptResult && dataView.scriptResult.imageBase64) {
                imageUrl = "data:image/png;base64," + dataView.scriptResult.imageBase64;
            }

            if (imageUrl) {
                this.imageElement.attr("src", imageUrl);
            } else {
                this.imageElement.attr("src", null);
            }

            this.onResizing(options.viewport);
        }

        public onResizing(finalViewport: IViewport): void {
            this.imageDiv
                .style('height', finalViewport.height + 'px')
                .style('width', finalViewport.width + 'px');
        }

        public destroy(): void {
            //TODO: Perform any cleanup tasks here
        }
    }
}
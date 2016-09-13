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
    
    // Below is a snippet of a definition for a object which will contain the properties values
    // selected by the users 
    /*interface VisualSettings {
        lineColor: string;
    }*/

    export class Visual implements IVisual {
        private imageDiv: HTMLDivElement;
        private imageElement: HTMLImageElement;

        // Snippet for defining the member property which will hold the property pane values
        /*private settings: VisualSettings;*/

        public constructor(options: VisualConstructorOptions) {
            this.imageDiv = document.createElement('div');
            this.imageDiv.className = 'rcv_autoScaleImageContainer';
            options.element.appendChild(this.imageDiv);
            
            this.imageElement = document.createElement('img');
            this.imageElement.className = 'rcv_autoScaleImage';

            this.imageDiv.appendChild(this.imageElement);
        }

        public update(options: VisualUpdateOptions) {
            let dataViews: DataView[] = options.dataViews;
            if (!dataViews || dataViews.length === 0)
                return;

            let dataView: DataView = dataViews[0];
            if (!dataView || !dataView.metadata)
                return;

            this.updateObjects(dataView.metadata.objects);

            let imageUrl: string = null;
            if (dataView.scriptResult && dataView.scriptResult.payloadBase64) {
                imageUrl = "data:image/png;base64," + dataView.scriptResult.payloadBase64;
            }

            if (imageUrl) {
                this.imageElement.src = imageUrl;
            } else {
                this.imageElement.src = null;
            }

            this.onResizing(options.viewport);
        }

        public onResizing(finalViewport: IViewport): void {
            this.imageDiv.style.height = finalViewport.height + 'px';
            this.imageDiv.style.width = finalViewport.width + 'px';
        }

        /**
         * This function gets called from the update function above. You should read the new values of the properties into 
         * your settings object so you will be able to use the new value in the enumerateObjectInstances function below.
         * 
         * Below there is a code snippet for a case where you want to expose a single property called "lineColor" from the object called "settings"
         * This object and property should be first defined in the capabilities.json file in the objects section.
         * In this code we get the property value from the objects (and have a default value in case the )
         */
        public updateObjects(objects: DataViewObjects) {
            /*this.settings = <VisualSettings>{
                lineColor: getFillValue(object, 'settings', 'lineColor', "#333333")
            };*/
        }

        /** 
         * This function gets called on each of the objects defined in the capabilities files and allow you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         * Below there is a code snippet for a case where you want to expose a single property called "lineColor" from the object called "settings"
         * This object and property should be first defined in the capabilities.json file in the objects section.
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let objectName = options.objectName;
            let objectEnumeration = [];

            /*switch( objectName ){
                case 'settings':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            lineColor: this.settings.lineColor,
                         },
                        selector: null
                    });
                    break;
            };*/

            return objectEnumeration;
        }
    }
}
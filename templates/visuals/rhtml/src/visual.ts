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
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import { VisualSettings } from "./settings";
import { parseElement, resetInjector, runHTMLWidgetRenderer } from "./htmlInjectionUtility";

enum VisualUpdateType {
    Data = 2,
    Resize = 4,
    ViewMode = 8,
    Style = 16,
    ResizeEnd = 32,
    All = 62,
}

// below is a snippet of a definition for an object which will contain the property values
// selected by the users
/*interface VisualSettings {
    lineColor: string;
}*/

// to allow this scenario you should first the following JSON definition to the capabilities.json file
// under the "objects" property:
// "settings": {
//     "displayName": "Visual Settings",
//     "description": "Visual Settings Tooltip",
//     "properties": {
//         "lineColor": {
//         "displayName": "Line Color",
//         "type": { "fill": { "solid": { "color": true }}}
//         }
//     }
// }

// in order to improve the performance, one can update the <head> only in the initial rendering.
// set to 'true' if you are using different packages to create the widgets
const updateHTMLHead: boolean = false;
const renderVisualUpdateType: number[] = [
    VisualUpdateType.Resize,
    VisualUpdateType.ResizeEnd,
    VisualUpdateType.Resize + VisualUpdateType.ResizeEnd
];

export class Visual implements IVisual {
    private rootElement: HTMLElement;
    private headNodes: Node[];
    private bodyNodes: Node[];
    private settings: VisualSettings;

    public constructor(options: VisualConstructorOptions) {
        if (options && options.element) {
            this.rootElement = options.element;
        }
        this.headNodes = [];
        this.bodyNodes = [];
    }

    public update(options: VisualUpdateOptions): void {

        if (!options ||
            !options.type ||
            !options.viewport ||
            !options.dataViews ||
            options.dataViews.length === 0 ||
            !options.dataViews[0]) {
            return;
        }
        const dataView: DataView = options.dataViews[0];
        this.settings = Visual.parseSettings(dataView);

        let payloadBase64: string = null;
        if (dataView.scriptResult && dataView.scriptResult.payloadBase64) {
            payloadBase64 = dataView.scriptResult.payloadBase64;
        }

        if (renderVisualUpdateType.indexOf(options.type) === -1) {
            if (payloadBase64) {
                this.injectCodeFromPayload(payloadBase64);
            }
        } else {
            this.onResizing(options.viewport);
        }
    }

    public onResizing(finalViewport: IViewport): void {
        // tslint:disable-next-line
        /* add code to handle resizing of the view port */
    }

    private injectCodeFromPayload(payloadBase64: string): void {
        // inject HTML from payload, created in R
        // the code is injected to the 'head' and 'body' sections.
        // if the visual was already rendered, the previous DOM elements are cleared

        resetInjector();

        if (!payloadBase64) {
            return;
        }

        // create 'virtual' HTML, so parsing is easier
        let el: HTMLHtmlElement = document.createElement("html");
        try {
            // tslint:disable-next-line
            el.innerHTML = window.atob(payloadBase64);
        } catch (err) {
            return;
        }

        // if 'updateHTMLHead == false', then the code updates the header data only on the 1st rendering
        // this option allows loading and parsing of large and recurring scripts only once.
        if (updateHTMLHead || this.headNodes.length === 0) {
            while (this.headNodes.length > 0) {
                let tempNode: Node = this.headNodes.pop();
                document.head.removeChild(tempNode);
            }
            let headList: HTMLCollectionOf<HTMLHeadElement> = el.getElementsByTagName("head");
            if (headList && headList.length > 0) {
                let head: HTMLHeadElement = headList[0];
                this.headNodes = parseElement(head, document.head);
            }
        }

        // update 'body' nodes, under the rootElement
        while (this.bodyNodes.length > 0) {
            let tempNode: Node = this.bodyNodes.pop();
            this.rootElement.removeChild(tempNode);
        }
        let bodyList: HTMLCollectionOf<HTMLBodyElement> = el.getElementsByTagName("body");
        if (bodyList && bodyList.length > 0) {
            let body: HTMLBodyElement = bodyList[0];
            this.bodyNodes = parseElement(body, this.rootElement);
        }

        runHTMLWidgetRenderer();
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions):
        VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}

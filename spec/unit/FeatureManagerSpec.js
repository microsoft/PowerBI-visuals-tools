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

import * as features from '../../lib/features/index.js';
import Package from '../../lib/Package.js';
import { Stage, VisualFeatureType } from '../../lib/features/FeatureTypes.js';
import { readJsonFromRoot } from '../../lib/utils.js';

const config = readJsonFromRoot('config.json');

describe("Features", () => {
    describe("Visual", () => {
        const { APIVersion, VisualVersion } = features;
        it("Should support API Version", () => {
            const Visual = {
                doesAPIVersionMatch: (minVersion) =>  {
                    expect(minVersion).toBe(config.constants.minAPIversion);
                    return true;
                }
            }
            expect(APIVersion.isSupported(Visual)).toBeTrue;
        });


        it("Should support Version", () => {
            const Visual = {
                isVisualVersionValid: (versionLength) =>  {
                    expect(versionLength).toBe(4);
                    return true;
                }
            }
            expect(VisualVersion.isSupported(Visual)).toBeTrue;
        });
    });

    describe("Package", () => {
        const featuresArray = Object.keys(features).filter(key => features[key].stage === Stage.PostBuild).map(key =>  features[key]);
        
        it("Should support features with correct sources", () => {
            const sourceCode = `.allowInteractions, .applySelectionFromFilter or .registerOnSelectCallback, .colorPalette,
                .createDataViewWildcardSelector, .showContextMenu, .downloadService and .exportVisualsContent,
                getFormattingModel, .isHighContrast, .launchUrl, .createLocalizationManager, .storageService, .openModalDialog,
                .eventService and .renderingStarted and .renderingFinished, tooltipService, .displayWarningIcon`
            const capabilities = {
                advancedEditMode: 1,
                supportsHighlight: true,
                supportsKeyboardFocus: true,
                supportsLandingPage: true,
                supportsMultiVisualSelection: true,
                supportsSynchronizingFilterState: true,
                subtotals: true,
                tooltips: {},
                objects: {
                    objectCategory: 2
                },
                drilldown: { 
                    roles: [] 
                },
                dataViewMappings: [
                    {
                        table: {
                            rows: {
                                dataReductionAlgorithm: {}
                            }
                        }
                    }
                ]
            }
            const correctPackage = new Package(sourceCode, capabilities, VisualFeatureType.All);

            featuresArray.forEach(feature => {
                expect(feature.isSupported(correctPackage)).toBeTrue;
            })
        });

        it("Should not support features with empty sources", () => {
            const emptyPackage = new Package('', {}, VisualFeatureType.All);

            featuresArray.forEach(feature => {
                expect(feature.isSupported(emptyPackage)).toBeFalse;
            })
        });
    });
});

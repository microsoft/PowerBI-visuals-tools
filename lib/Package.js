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
/**
 * Represents an instance of a visual package based on file path
 */
export default class Package {
    sourceCode;
    capabilities;
    visualFeatureType;
    constructor(sourceCode, capabilities, visualFeatureType) {
        this.sourceCode = sourceCode;
        this.capabilities = capabilities;
        this.visualFeatureType = visualFeatureType;
    }
    contain(keyword) {
        return this.sourceCode.indexOf(keyword) > -1;
    }
    capabilityEnabled(expectedObject) {
        return this.doesObjectInclude(this.capabilities, expectedObject);
    }
    doesObjectInclude(capabilitiesValue, expectedValue) {
        if (typeof capabilitiesValue !== 'object' || typeof expectedValue !== 'object') {
            return capabilitiesValue === expectedValue;
        }
        if (Array.isArray(capabilitiesValue) && Array.isArray(expectedValue)) {
            return expectedValue.every((expectedValueItem) => {
                return capabilitiesValue.some((capabilitiesValueItem) => {
                    return this.doesObjectInclude(capabilitiesValueItem, expectedValueItem);
                });
            });
        }
        return Object.keys(expectedValue).every((key) => {
            return this.doesObjectInclude(capabilitiesValue[key], expectedValue[key]);
        });
    }
}

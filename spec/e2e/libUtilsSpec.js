/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ''Software''), to deal
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

'use strict';

let libUtils = require('../../lib/utils');

describe('E2E - lib/utils', () => {
    it(`standardizeDate() parse date correctly for different locale regions`, (done) => {
        let dateStandard = Date.parse('2022-5-15 13:24');
        let dateByLocales = {
            'en-US': '5/15/2022 1:24 PM',
            'en-AU': '15/05/2022 1:24 PM',
            'en-CA': '2022-05-15 1:24 PM',
            'ru-RU': '15.05.2022 13:24',
            'ja-JP': '2022/05/15 13:24'
        };
        let standardizeDate = libUtils.standardizeDate;
        for (let prop in dateByLocales) {
            expect(Date.parse(standardizeDate(dateByLocales[prop], prop)))
                .withContext(`for ${prop} region`)
                .toBe(dateStandard);
        }
        done();
    });
});

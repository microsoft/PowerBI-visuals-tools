"use strict";

/* eslint-disable no-eval */
const fs = require("fs");

const requiredLocales = ["en-US"]; // default locales

function localizationLoader(source) {
    const variableDeclaration = source.substring(0, source.indexOf("locales = {") + 10); // save the start of the file
    const result = Object.entries(eval(source))
        .filter(([key]) => 
            (requiredLocales.includes(key) ||  fs.existsSync(`./stringResources/${key}/resources.resjson`)));

    return variableDeclaration + JSON.stringify(Object.fromEntries(result));
}

module.exports = localizationLoader;

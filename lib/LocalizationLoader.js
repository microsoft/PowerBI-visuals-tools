"use strict";

const fs = require("fs");

function source(source) {
    const result = {};
    const variableDeclaration = source.substring(0, source.indexOf("= {") + 2); // save the start of the file
    // eslint-disable-next-line no-eval
    source = eval(source); // parse JS object with functions inside
    Object.keys(source).forEach(
        (key) =>
            (key === "en-US" || // always save default locale
            fs.existsSync(`./stringResources/${key}/resources.resjson`)) && // check if current locale exists in stringResources
            (result[key] = source[key])
    );

  return variableDeclaration + JSON.stringify(result);
}

module.exports = source;

export default function (options) {
    return `{
    "visual": {
        "name": "${options.name}",
        "displayName": "${options.displayName}",
        "guid": "${options.guid}",
        "visualClassName": "${options.visualClassName}",
        "version": "1.0.0.0",
        "description": "",
        "supportUrl": "",
        "gitHubUrl": ""
    },
    "apiVersion": "${options.apiVersion}",
    "author": {
        "name": "",
        "email": ""
    },
    "assets": {
        "icon": "assets/icon.png"
    },
    "externalJS": [
        "node_modules/powerbi-visuals-utils-dataviewutils/lib/index.js"
    ],
    "style": "style/visual.less",
    "capabilities": "capabilities.json",
    "dependencies": "dependencies.json",
    "stringResources": []
}`;
};

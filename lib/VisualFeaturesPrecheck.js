const compareVersions = require("compare-versions");
const globalConfig = require('../config.json');
const path = require('path');
const fs = require('fs-extra');

const minAPIversion = globalConfig.constants.minAPIversion;
const pathToCapabilities = path.join("./", "capabilities.json");
const pathToPackageJSON = path.join("./", "package.json");

const isStringIncluded = (content, strings = []) => {
    return !strings.map(str => content.indexOf(str) !== -1).some(bool => !bool);
};

const isEslintSupported = (packageJSON) => {
    return Object.entries(packageJSON.scripts).some(([, value]) => value.includes("eslint"));
};

const detailedFeatureDescription = (featureName) => {
    return `${featureName} - ${featuresLinks[featureName]}`;
};

const featureErrorDescription = {
    api: `Please use 'powerbi-visuals-api' ${minAPIversion} or above to build a visual.`,
    eslint: "Your visual doesn't support ESLint",
    version: "Your visual version should consist of 4 parts"
};

const featuresLinks = {
    "Advanced Edit Mode": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/advanced-edit-mode",
    "Allow Interactions": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/visuals-interactions",
    "Analytics Pane": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/analytics-pane",
    "Bookmarks": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/bookmarks-support",
    "Color Palette": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-colors-power-bi-visual",
    "Conditional Formatting": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/conditional-format",
    "Context Menu": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/context-menu",
    "Modal Dialog": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/create-display-dialog-box",
    "Drill-Down": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/drill-down-support",
    "Fetch More Data": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/fetch-more-data",
    "File Download": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/file-download-api",
    "Format Pane": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/format-pane",
    "High Contrast": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/high-contrast-support",
    "Highlight Data": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/highlight", 
    "Keyboard Navigation": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportskeyboardfocus-feature",
    "Landing Page": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/landing-page",
    "Launch URL": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/launch-url",
    "Localizations": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/localization",
    "Local Storage": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/local-storage",
    "Rendering Events": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/event-service",
    "Selection Across Visuals": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/supportsmultivisualselection-feature",
    "Sync Slicer": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/selection-api",
    "Tooltips": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-tooltips",
    "Total SubTotal": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/total-subtotal-api",
    "Warning Icon": "https://learn.microsoft.com/en-us/power-bi/developer/visuals/visual-display-warning-icon"
};

const isFeaturesSupported = {
    precheck: {
        error: {
            api: (config) => compareVersions(config.apiVersion ?? minAPIversion, minAPIversion) !== -1,
            eslint: (config, packageJSON) => isEslintSupported(packageJSON),
            version: (config, packageJSON) => packageJSON.version?.split(".").length === 4
        }
    },
    content: {
        deprecation: {
            "Format Pane": (content) => isStringIncluded(content, ["getFormattingModel"])
        },
        warn: {
            "Allow Interactions": (content) => isStringIncluded(content, ["allowInteractions"]),
            "Context Menu": (content) => isStringIncluded(content, ["showContextMenu"]),
            "High Contrast": (content) => isStringIncluded(content, ["isHighContrast"]),
            "Localizations": (content) => isStringIncluded(content, [".createLocalizationManager"]),
            "Rendering Events": (content) => isStringIncluded(content, ["eventService", "renderingStarted", "renderingFinished"]),
            "Color Palette": (content) => isStringIncluded(content, [".colorPalette"]),
            "Tooltips": (content) => isStringIncluded(content, ["tooltipService"])
        },
        info: { 
            "Bookmarks": (content, isSlicer) => !isSlicer || isStringIncluded(content, [
                "applySelectionFromFilter", 
                "selectionManager.registerOnSelectCallback", 
                "createInteractivitySelectionService"
            ]),
            "Conditional Formatting": (content) => isStringIncluded(content, [".createDataViewWildcardSelector"]),
            "Modal Dialog": (content) => isStringIncluded(content, ["openModalDialog"]),
            "File Download": (content) => isStringIncluded(content, ["downloadService", "exportVisualsContent"]),
            "Launch URL": (content) => isStringIncluded(content, ["launchUrl"]),
            "Local Storage": (content) => isStringIncluded(content, [".storageService"]),
            "Warning Icon": (content) => isStringIncluded(content, ["displayWarningIcon"])
        }
    },
    capabilities: {
        warn: {
            "Highlight Data": (capabilities, isSlicer) => 
                isSlicer || Boolean(capabilities?.supportsHighlight),
            "Keyboard Navigation": (capabilities) => Boolean(capabilities?.supportsKeyboardFocus),
            "Landing Page": (capabilities) => Boolean(capabilities?.supportsLandingPage),
            "Selection Across Visuals": (capabilities, isSlicer) => isSlicer || Boolean(capabilities?.supportsMultiVisualSelection),
            "Sync Slicer": (capabilities, isSlicer) => !isSlicer || capabilities?.supportsSynchronizingFilterState,
            "Total SubTotal": (capabilities) => !capabilities?.dataViewMappings?.some(dataView => dataView.matrix) || Boolean(capabilities?.subtotals)
        },
        info: {
            "Advanced Edit Mode": (capabilities) => Boolean(capabilities?.advancedEditModeSupport),
            "Analytics Pane": (capabilities) => Object.entries(capabilities?.objects).some(([, content]) => content.objectCategory === 2),
            "Drill-Down": (capabilities) => !capabilities?.dataViewMappings?.some(dataView => dataView.matrix) || Boolean(capabilities?.drilldown),
            "Fetch More Data": (capabilities) => capabilities?.dataViewMappings?.some(dataView => Boolean(dataView.table?.rows?.dataReductionAlgorithm))
        }
    }
};

class FeatureAnalyzer {
    async unsupportedFeatureList(config) {
        const pathToJS = path.join("./", (config.build ?? globalConfig.build).dropFolder, "visual.js");
        const jsContent = await fs.readFile(pathToJS, "utf8");
        const capabilities = JSON.parse(await fs.readFile(pathToCapabilities, "utf8"));
        const isSlicer = capabilities.objects.general?.properties?.filter?.type?.filter;
        const result = {
            deprecation: [],
            warn: [],
            info: []
        };
        // check content on feature support
        for (const [featureSeverity, contentFeaturesList] of Object.entries(isFeaturesSupported.content)) {
            for (const [feature, isFeatureSupported] of Object.entries(contentFeaturesList)) {
                if (!isFeatureSupported(jsContent, isSlicer)) {
                    result[featureSeverity].push(detailedFeatureDescription(feature));
                }
            }
        }
        // check capabilities on feature support
        for (const [featureSeverity, capabilitiesFeaturesList] of Object.entries(isFeaturesSupported.capabilities)) {
            for (const [feature, isFeatureSupported] of Object.entries(capabilitiesFeaturesList)) {
                if (!isFeatureSupported(capabilities, isSlicer)) {
                    result[featureSeverity].push(detailedFeatureDescription(feature));
                }
            }
        }
        return result;
        
    }

    async preBuildCheck(config) {
        const errors = [];
        const packageJSON = JSON.parse(await fs.readFile(pathToPackageJSON, "utf8"));
    
        for (const [feature, isFeatureSupported] of Object.entries(isFeaturesSupported.precheck.error)) {
            if (!isFeatureSupported(config, packageJSON)) {
                errors.push(featureErrorDescription[feature]);
            }
        }
    
        return errors;
    }
}

module.exports = new FeatureAnalyzer();

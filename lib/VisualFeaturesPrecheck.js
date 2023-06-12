import compareVersions from "compare-versions";
import { readJsonFromRoot, readJsonFromVisual } from "./utils.js";
const globalConfig = readJsonFromRoot('config.json');
const minAPIversion = globalConfig.constants.minAPIversion;
const pathToPackageJSON = "package.json";
const isStringIncluded = (content, strings) => {
    return !strings?.map(str => content.indexOf(str) !== -1).some(bool => !bool);
};
const isEslintSupported = (packageJSON) => {
    return Object.entries(packageJSON.scripts).some(([, value]) => value.includes("eslint"));
};
const featureErrorDescription = {
    api: `Please use 'powerbi-visuals-api' ${minAPIversion} or above to build a visual.`,
    eslint: "Your visual doesn't support ESLint",
    version: "Your visual version should consist of 4 parts"
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
            "Highlight Data": (capabilities, isSlicer) => isSlicer || Boolean(capabilities?.supportsHighlight),
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
    preBuildCheck(config) {
        const errors = [];
        const packageJSON = readJsonFromVisual(pathToPackageJSON);
        for (const [feature, isFeatureSupported] of Object.entries(isFeaturesSupported.precheck.error)) {
            if (!isFeatureSupported(config, packageJSON)) {
                errors.push(featureErrorDescription[feature]);
            }
        }
        return errors;
    }
}
export default new FeatureAnalyzer();

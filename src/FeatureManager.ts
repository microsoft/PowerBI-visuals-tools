import { Severity, Stage } from "./Features/FeatureTypes.js";
import {
    AdvancedEditMode, AllowInteractions, AnalyticsPane, Bookmarks, 
    ColorPalette, ConditionalFormatting, ContextMenu, DrillDown, 
    FetchMoreData, FileDownload, FormatPane, HighContrast, 
    HighlightData, KeyboardNavigation, LandingPage, LaunchURL,
    Localizations, LocalStorage, ModalDialog, RenderingEvents,
    SelectionAcrossVisuals, SyncSlicer, Tooltips, TotalSubTotal,
    WarningIcon, APIVersion, ESLint, VisualVersion
} from "./Features/index.js";
import { Visual } from "./Visual.js";
import Package from "./Package.js";

export interface Status {
    ok: boolean,
    logs: Logs
}

export interface Logs {
    errors: string[],
    warnings: string[],
    info: string[],
    deprecation: string[]
}

export class FeatureManager {
    public features = [ 
        AdvancedEditMode, AllowInteractions, AnalyticsPane, Bookmarks, 
        ColorPalette, ConditionalFormatting, ContextMenu, DrillDown, 
        FetchMoreData, FileDownload, FormatPane, HighContrast, 
        HighlightData, KeyboardNavigation, LandingPage, LaunchURL,
        Localizations, LocalStorage, ModalDialog, RenderingEvents,
        SelectionAcrossVisuals, SyncSlicer, Tooltips, TotalSubTotal,
        WarningIcon, APIVersion, ESLint, VisualVersion
    ];

    public validate(stage: Stage, sourceInstance: Visual | Package): Status {
        const status: Status = {
            ok: true,
            logs: {
                errors: [],
                warnings: [],
                info: [],
                deprecation: []
            }
        }
        this.features.forEach(feature => {
            if (feature.stage == stage && (feature.visualType & sourceInstance.visualType)) {
                if(!feature.isSupported(<any>sourceInstance)) {
                    switch(feature.severity) {
                        case Severity.Error:
                            status.ok = false;
                            status.logs.errors.push(feature.errorMessage);
                            break;
                        case Severity.Warning:
                            status.logs.warnings.push(feature.errorMessage);
                            break;
                        case Severity.Info:
                            status.logs.info.push(feature.errorMessage);
                            break;
                        case Severity.Deprecation:
                            status.logs.deprecation.push(feature.errorMessage);
                            break;
                    }
                }
            }
        });
        return status
    }
}
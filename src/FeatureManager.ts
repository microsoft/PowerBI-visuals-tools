import { Severity, Stage } from "./features/FeatureTypes.js";
import * as features from "./features/index.js";
import { Visual } from "./Visual.js";
import Package from "./Package.js";

export interface ValidationStats {
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
    public features = Object.keys(features).map(key =>  features[key]);

    public validate(stage: Stage, sourceInstance: Visual | Package): ValidationStats {
        const status: ValidationStats = {
            ok: true,
            logs: {
                errors: [],
                warnings: [],
                info: [],
                deprecation: []
            }
        }
        this.features.forEach(feature => {
            if (feature.stage == stage && (feature.visualFeatureType & sourceInstance.visualFeatureType)) {
                if(!feature.isSupported(sourceInstance)) {
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
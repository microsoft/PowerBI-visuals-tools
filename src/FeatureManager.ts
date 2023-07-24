import { Severity, Stage } from "./features/FeatureTypes.js";
import * as features from "./features/index.js";
import { Visual } from "./Visual.js";
import Package from "./Package.js";

export enum Status {
    Success,
    Error
}
export interface ValidationStats {
    status: Status,
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
        const result: ValidationStats = {
            status: Status.Success,
            logs: {
                errors: [],
                warnings: [],
                info: [],
                deprecation: []
            }
        }
        this.features
            .filter(feature => feature.stage == stage)
            .filter(feature => feature.visualFeatureType & sourceInstance.visualFeatureType)
            .filter(feature => !feature.isSupported(sourceInstance))
            .forEach(feature => {
                const errorMessage = feature.errorMessage;
                switch(feature.severity) {
                    case Severity.Error:
                        result.status = Status.Error;
                        result.logs.errors.push(errorMessage);
                        break;
                    case Severity.Warning:
                        result.logs.warnings.push(errorMessage);
                        break;
                    case Severity.Info:
                        result.logs.info.push(errorMessage);
                        break;
                    case Severity.Deprecation:
                        result.logs.deprecation.push(errorMessage);
                        break;
                }
        });
        return result
    }
}
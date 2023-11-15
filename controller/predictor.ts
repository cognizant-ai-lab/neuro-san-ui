// Import constants
import {
    PredictorParams,
    SUPPORTED_CLASSIFICATION_MODELS,
    SUPPORTED_CLASSIFIER_METRICS,
    SUPPORTED_REGRESSION_MODELS,
    SUPPORTED_REGRESSOR_METRICS,
} from "../components/internal/flow/predictorinfo"

export function FetchPredictors(predictorType: string): string[] {
    /*
    This function returns the types for predictor available within a given super-type such as "regressor" or
    "classifier"
    */

    let predictorResp: string[]

    if (predictorType == "regressor") {
        predictorResp = Object.keys(SUPPORTED_REGRESSION_MODELS)
    } else if (predictorType == "classifier") {
        predictorResp = Object.keys(SUPPORTED_CLASSIFICATION_MODELS)
    }

    return predictorResp
}

export function FetchMetrics(predictorType: string) {
    /*
    This function returns the list of supported metrics based on the predictor type.
    */

    return predictorType === "regressor" ? SUPPORTED_REGRESSOR_METRICS : SUPPORTED_CLASSIFIER_METRICS
}

export function FetchParams(predictorType: string, predictorName: string): PredictorParams {
    /*
    This function returns the configuration parameters for the predictor
    */
    let params

    if (predictorType == "regressor") {
        params = structuredClone(SUPPORTED_REGRESSION_MODELS[predictorName])
    } else if (predictorType == "classifier") {
        params = structuredClone(SUPPORTED_CLASSIFICATION_MODELS[predictorName])
    }

    return params
}

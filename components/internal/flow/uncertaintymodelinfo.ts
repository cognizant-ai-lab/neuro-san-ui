/*
Configuration settings and constants for uncertainty model node configuration popup
 */

type UncertaintyModelParameterType = boolean|number|string|[]

export enum ParamType {
    BOOLEAN,
    STRING,
    INT,
    ENUM
}

enum KernelType {
    "RBF" = "RBF",
    "RBFY" = "RBFY",
    "RBF_PLUS_RBF" = "RBF_PLUS_RBF"
}

enum FrameworkVariant {
    "GP Corrected" = "GP Corrected",
    "GP Corrected Input Only" = "GP Corrected Input Only",
    "GP Corrected Output Only" = "GP Corrected Output Only",
    "GP" = "GP",
    "GP Input Only" = "GP Input Only",
    "GP Output Only" = "GP Output Only"
}

enum ConfidenceInterval {
    C50 = 50,
    C75 = 75,
    C90 = 90,
    C95 = 95,
    C99 = 99
}

export interface UncertaintyModelParamField {
    description: string,

    // Data type of the parameter
    type: ParamType,

    // List of all available values. Only used for Enum types.
    allValues?: string[]

    // Value is an optional field that can be used within a form
    // etc to denote user input
    value?: UncertaintyModelParameterType

    isAdvanced: boolean
}

export interface UncertaintyModelParams {
    [key: string]: UncertaintyModelParamField
}


export const UNCERTAINTY_MODEL_PARAMS: UncertaintyModelParams = {
    "confidence_interval": {
        value: ConfidenceInterval.C95.valueOf(),
        description: "Confidence level (in %) for the confidence intervals",
        type: ParamType.ENUM,
        allValues: Object.values(ConfidenceInterval).filter((v) => !isNaN(Number(v))).map(v => String(v)),
        isAdvanced: false
    },

    "use_ard": {
        value: true,
        description: "Enable Automatic Relevance Determination (ARD)",
        type: ParamType.BOOLEAN,
        isAdvanced: true
    },

    "max_iterations_optimizer": {
        value: 1000,
        description: "Maximum iterations for optimizer",
        type: ParamType.INT,
        isAdvanced: true
    },

    "num_svgp_inducing_points": {
        value: 50,
        description: "Number of inducing points for the SVGP model",
        type: ParamType.INT,
        isAdvanced: true
    },

    "framework_variant": {
        value: FrameworkVariant["GP Corrected"].valueOf(),
        description: "Framework variant; the default is the standard method",
        type: ParamType.ENUM,
        allValues: Object.keys(FrameworkVariant).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: true
    },

    "kernel_type": {
        value: KernelType.RBF_PLUS_RBF.valueOf(),
        description: "Kernel type for the Gaussian Processes model. The default is the I/O kernel with " +
            "radial basis function",
        type: ParamType.ENUM,
        allValues: Object.keys(KernelType).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: true
    }

}

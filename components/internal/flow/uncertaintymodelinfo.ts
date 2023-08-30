// Too many "unused" enum values to disable individually. The values are used, just not explicitly so the IDE
// scanner (IntelliJ) gets confused.
// noinspection JSUnusedGlobalSymbols

/*
Configuration settings and constants for uncertainty model node configuration popup
 */

import {BaseParameterType, NodeParams} from "./nodes/generic/types"

// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
enum KernelType {
    "RBF" = "RBF",
    "RBFY" = "RBFY",
    "RBF_PLUS_RBF" = "RBF_PLUS_RBF"
}

// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
enum FrameworkVariant {
    "GP Corrected" = "GP Corrected",
    "GP Corrected Input Only" = "GP Corrected Input Only",
    "GP Corrected Output Only" = "GP Corrected Output Only",
    "GP" = "GP",
    "GP Input Only" = "GP Input Only",
    "GP Output Only" = "GP Output Only"
}

// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
enum ConfidenceInterval {
    C50 = 50,
    C75 = 75,
    C90 = 90,
    C95 = 95,
    C99 = 99
}

export const UNCERTAINTY_MODEL_PARAMS: NodeParams = {
    "confidence_interval": {
        default_value: ConfidenceInterval.C95.valueOf(),
        description: "Confidence level (in %) for the confidence intervals",
        type: BaseParameterType.ENUM,
        enum: ConfidenceInterval,
        isAdvanced: false
    },

    "use_ard": {
        default_value: true,
        description: "Enable Automatic Relevance Determination (ARD)",
        type: BaseParameterType.BOOLEAN,
        isAdvanced: true
    },

    "max_iterations_optimizer": {
        default_value: 1000,
        description: "Maximum iterations for optimizer",
        max: 2000,
        min: 100,
        type: BaseParameterType.INT,
        isAdvanced: true
    },

    "num_svgp_inducing_points": {
        default_value: 50,
        description: "Number of inducing points for the SVGP model",
        max: 100,
        min: 1,
        type: BaseParameterType.INT,
        isAdvanced: true
    },

    "framework_variant": {
        default_value: FrameworkVariant["GP Corrected"].valueOf(),
        description: "Framework variant; the default is the standard method",
        type: BaseParameterType.ENUM,
        enum: FrameworkVariant,
        isAdvanced: true
    },

    "kernel_type": {
        default_value: KernelType.RBF_PLUS_RBF.valueOf(),
        description: "Kernel type for the Gaussian Processes model. The default is the I/O kernel with " +
            "radial basis function",
        type: BaseParameterType.ENUM,
        enum: KernelType,
        isAdvanced: true
    }

}

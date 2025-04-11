import getConfig from "next/config"

const {publicRuntimeConfig} = getConfig()

// Name to use for application
export const LOGO: string = "Neuro AI"
export const GENERIC_LOGO: string = "Autopilot"

// Build version (passed in from build system)
export const UNILEAF_VERSION: string = publicRuntimeConfig.unileafVersion

export const BUILD_TARGET: string = publicRuntimeConfig.buildTarget

export const ESPResultverbs = ["max", "min", "mean"]

// Maximum allowed categorical values before we prompt a user to add a category reducer node.
// This number was the previous maximum categorical values the BE would handle.
export const MAX_ALLOWED_CATEGORIES = 20

// Maximum allowed categorical values from a datasource before the row is rejected.
// https://leaf-ai.atlassian.net/browse/UN-2078
export const MAX_DATA_PROFILE_ALLOWED_CATEGORIES = 100

// "Magic" user name for demo projects
export const DEMO_USER = "leaf_demo_user"

export const EDIT_EXPERIMENT_DIALOG_TITLE = "Renaming Experiment Name"

export const EDIT_EXPERIMENT_DIALOG_TEXT =
    "If you rename this experiment, notebooks from past runs for this experiment will " +
    "no longer function, as they will be referencing the old experiment name for " +
    "accessing datasets and Python requirements files. It will be your responsibility " +
    "to update those notebooks if you wish to download and use them. Proceed anyway?"

export const CONTACT_US_CONFIRMATION_DIALOG_TITLE = "Contact Us"

export const CONTACT_US_CONFIRMATION_DIALOG_TEXT =
    "Would you like to send the Cognizant Neuro AI support team an email? " +
    "You will need to have an email client installed on your device in order " +
    "to continue. If you don't have an email client, you can still contact us at " +
    "NeuroAiSupport@cognizant.com using a web based email client."

/**
 * The default user image to use when the user does not have a profile picture.
 */
export const DEFAULT_USER_IMAGE = "https://www.gravatar.com/avatar/?d=mp"

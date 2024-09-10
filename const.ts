import getConfig from "next/config"

// Define the Base Colors
export const MaximumBlue: string = "#000048"
export const Apple: string = "#26EFE9"
const {publicRuntimeConfig} = getConfig()

// Name to use for application
export const LOGO: string = "Neuro AI 2.0"
export const GENERIC_LOGO: string = "Autopilot"

// Build version (passed in from build system)
export const UNILEAF_VERSION: string = publicRuntimeConfig.unileafVersion

export const ESPResultverbs = ["max", "min", "mean"]

/* TODO: feels like it should be a stylesheet somewhere. But the current chatbot library we're using seems to
require it in this format. */
export const chatbotTheme = {
    background: "#f5f8fb",
    fontFamily: "var(--bs-body-font-family)",
    headerBgColor: "var(--bs-primary)",
    headerFontColor: "#fff",
    headerFontSize: "15px",
    botBubbleColor: "var(--bs-secondary)",
    botFontColor: "#fff",
    userBubbleColor: "#fff",
    userFontColor: "#4a4a4a",
}

// Maximum allowed categorical values before we prompt a user to add a category reducer node.
// This number was the previous maximum categorical values the BE would handle.
export const MAX_ALLOWED_CATEGORIES = 20

// Maximum allowed categorical values from a datasource before the row is rejected.
// https://leaf-ai.atlassian.net/browse/UN-2078
export const MAX_DATA_PROFILE_ALLOWED_CATEGORIES = 100

export const CATEGORICAL = "CATEGORICAL"

// "Magic" user name for demo projects
export const DEMO_USER = "leaf_demo_user"

export const EDIT_EXPERIMENT_DIALOG_TITLE = "Renaming Experiment Name"

export const EDIT_EXPERIMENT_DIALOG_TEXT =
    "If you rename this experiment, notebooks from past runs for this experiment will " +
    "no longer function, as they will be referencing the old experiment name for " +
    "accessing datasets and Python requirements files. It will be your responsibility " +
    "to update those notebooks if you wish to download and use them. Proceed anyway?"

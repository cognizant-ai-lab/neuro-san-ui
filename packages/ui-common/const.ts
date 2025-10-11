// Name to use for application
export const LOGO: string = "Neuro® AI"

export const NEURO_SAN_UI_VERSION = process.env["NEXT_PUBLIC_NEURO_SAN_UI_VERSION"] ?? "Unknown Version"

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

export const ENABLE_AUTHENTICATION = process.env["NEXT_PUBLIC_ENABLE_AUTHENTICATION"] === "true" || false

// Default "dev URL" for NeuroSan server, to allow for "zero config" execution.
export const DEFAULT_NEURO_SAN_SERVER_URL = "https://neuro-san-dev.decisionai.ml"

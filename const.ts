import getConfig from "next/config"

const {publicRuntimeConfig} = getConfig()

// Name to use for application
export const LOGO: string = "Neuro® AI"

// Build version (passed in from build system)
export const UNILEAF_VERSION: string = publicRuntimeConfig.unileafVersion

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

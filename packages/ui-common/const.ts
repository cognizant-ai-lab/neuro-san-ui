/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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

export const authenticationEnabled = (): boolean => process.env["NEXT_PUBLIC_ENABLE_AUTHENTICATION"] !== "false"

// Default "dev URL" for NeuroSan server, to allow for "zero config" execution.
export const DEFAULT_NEURO_SAN_SERVER_URL = "https://neuro-san-dev.decisionai.ml"

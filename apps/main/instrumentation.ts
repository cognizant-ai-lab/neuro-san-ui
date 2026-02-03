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

/**
 * This file executes at NextJS startup. It is intended for injecting instrumentation and monitoring but here
 * we are using it to check that the environment variables are set correctly.
 *
 * @see https://nextjs.org/docs/app/guides/instrumentation
 */

import {authenticationEnabled} from "@cognizant-ai-lab/ui-common/const"

/**
 * List of environment variables that are required for the app to run. If any of these are not set, the app will
 * exit with an error message.
 */
export const REQUIRED_ENV_VARS = [
    "AUTH0_CLIENT_ID",
    "AUTH0_CLIENT_SECRET",
    "AUTH0_DOMAIN",
    "AUTH0_ISSUER",
    "NEURO_SAN_SERVER_URL",
    "SUPPORT_EMAIL_ADDRESS",
]

export const OPTIONAL_ENV_VARS = ["NEXT_PUBLIC_LOGO_DEV_TOKEN", "OPENAI_API_KEY"]

export function register() {
    if (authenticationEnabled()) {
        const missingEnvVars = REQUIRED_ENV_VARS.filter((envVar) => !process.env[envVar])

        if (missingEnvVars.length > 0) {
            throw new Error(
                `Error: The following environment variable(s) are empty or undefined:\n${missingEnvVars.join("\n")}`
            )
        }
    }

    const missingOptionalEnvVars = OPTIONAL_ENV_VARS.filter((envVar) => !process.env[envVar])
    if (missingOptionalEnvVars.length > 0) {
        console.warn(
            "Warning: The following optional environment variable(s) are empty or undefined. " +
                `Some features may not work correctly:\n${missingOptionalEnvVars.join("\n")}`
        )
    }
}

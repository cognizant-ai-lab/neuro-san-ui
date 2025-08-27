/**
 * This file executes at NextJS startup. It is intended for injecting instrumentation and monitoring but here
 * we are using it to check that the environment variables are set correctly.
 *
 * @see https://nextjs.org/docs/app/guides/instrumentation
 */

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

// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export function register() {
    const missingEnvVars = REQUIRED_ENV_VARS.filter((envVar) => !process.env[envVar])

    if (missingEnvVars.length > 0) {
        throw new Error(
            `Error: The following environment variable(s) are empty or undefined:\n${missingEnvVars.join("\n")}`
        )
    }
}

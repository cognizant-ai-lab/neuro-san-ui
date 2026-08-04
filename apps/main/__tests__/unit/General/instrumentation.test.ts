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

/*
Tests for instrumentation.ts Next.js startup file.
 */

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {enableAuthenticationEnvVar} from "../../../Const"
import {OPTIONAL_ENV_VARS, register, REQUIRED_ENV_VARS, REQUIRED_FOR_AUTH_ENV_VARS} from "../../../instrumentation"

vi.mock("../../../../../packages/ui-common/const")

const setAllEnvVars = () => {
    // Set all required environment variables
    REQUIRED_ENV_VARS.forEach((envVar) => {
        process.env[envVar] = `${envVar}-test_value`
    })

    // Set all required-for-authentication environment variables
    REQUIRED_FOR_AUTH_ENV_VARS.forEach((envVar) => {
        process.env[envVar] = `${envVar}-test_value`
    })

    // Set all optional environment variables
    OPTIONAL_ENV_VARS.forEach((envVar) => {
        process.env[envVar] = `${envVar}-test_value`
    })
}

describe("instrumentation", () => {
    withStrictMocks()

    beforeEach(() => {
        // Default to "authentication enabled"
        process.env[enableAuthenticationEnvVar] = "true"
        setAllEnvVars()
    })

    const expectConsoleOutput = (
        authEnabled: boolean,
        openAIKeySet: string,
        logoServiceTokenSet: string,
        neuroSanServerURL: string
    ) => {
        expect(console.info).toHaveBeenCalledTimes(5)
        expect(console.info).toHaveBeenCalledWith("Start-up: Environment variables checked successfully.")
        expect(console.info).toHaveBeenCalledWith("Authentication enabled:", authEnabled)
        expect(console.info).toHaveBeenCalledWith("OpenAI API key:", openAIKeySet)
        expect(console.info).toHaveBeenCalledWith("Logo service token:", logoServiceTokenSet)
        expect(console.info).toHaveBeenCalledWith("Neuro SAN server URL:", neuroSanServerURL)
    }

    it("should not throw if env vars are all set", () => {
        vi.spyOn(console, "info").mockImplementation(vi.fn())
        expect(() => register()).not.toThrow()

        // Various start-up messages
        expectConsoleOutput(true, "set", "set", "NEURO_SAN_SERVER_URL-test_value")
    })

    it("should throw if any required env vars not set", () => {
        // Unset a required environment variable
        delete process.env[REQUIRED_ENV_VARS[0]]

        expect(() => register()).toThrow(Error)
    })

    it("Should throw if authentication is enabled and required variable is not set", () => {
        // Unset an environment variable that is only required for authentication
        delete process.env[REQUIRED_FOR_AUTH_ENV_VARS[0]]

        expect(() => register()).toThrow()
    })

    it("Should not throw if authentication is disabled and required variable is not set", () => {
        vi.spyOn(console, "info").mockImplementation(vi.fn())
        process.env[enableAuthenticationEnvVar] = "false"

        // Unset an environment variable that is only required for authentication
        delete process.env[REQUIRED_FOR_AUTH_ENV_VARS[0]]

        expect(() => register()).not.toThrow()

        // Various start-up messages
        expectConsoleOutput(false, "set", "set", "NEURO_SAN_SERVER_URL-test_value")
    })

    it("Should not throw if optional variables are not set", () => {
        vi.spyOn(console, "info").mockImplementation(vi.fn())
        process.env[enableAuthenticationEnvVar] = "false"

        // Clear all optional environment variables
        OPTIONAL_ENV_VARS.forEach((envVar) => {
            delete process.env[envVar]
        })

        // Spy on console.warn to suppress output during test
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn())

        expect(() => register()).not.toThrow()

        OPTIONAL_ENV_VARS.forEach((envVar) => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(envVar))
        })

        // Various start-up messages
        expectConsoleOutput(false, "not set", "not set", "NEURO_SAN_SERVER_URL-test_value")
    })
})

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
Tests for instrumentation.ts NextJS startup file.
 */

import {authenticationEnabled} from "@cognizant-ai-lab/ui-common/const"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {OPTIONAL_ENV_VARS, register, REQUIRED_ENV_VARS, REQUIRED_FOR_AUTH_ENV_VARS} from "../../../instrumentation"

jest.mock("../../../../../packages/ui-common/const")

// It's okay to do this in tests
/* eslint-disable @typescript-eslint/no-dynamic-delete */

function setAllEnvVars() {
    // Set all required environment variables
    REQUIRED_ENV_VARS.forEach((envVar) => {
        process.env[envVar] = "test_value"
    })

    // Set all required-for-authentication environment variables
    REQUIRED_FOR_AUTH_ENV_VARS.forEach((envVar) => {
        process.env[envVar] = "test_value"
    })

    // Set all optional environment variables
    OPTIONAL_ENV_VARS.forEach((envVar) => {
        process.env[envVar] = "test_value"
    })
}

describe("instrumentation", () => {
    withStrictMocks()
    beforeEach(() => {
        ;(authenticationEnabled as jest.Mock).mockReturnValue(true)
        setAllEnvVars()
    })

    it("should not throw if env vars are all set", () => {
        expect(() => register()).not.toThrow()
    })

    it("should throw if any required env vars not set", () => {
        // Unset a required environment variable
        delete process.env[REQUIRED_ENV_VARS[0]]

        expect(() => register()).toThrow(Error)
    })

    it("Should throw if authentication is enabled and required variable is not set", () => {
        ;(authenticationEnabled as jest.Mock).mockReturnValue(true)

        // Unset an environment variable that is only required for authentication
        delete process.env[REQUIRED_FOR_AUTH_ENV_VARS[0]]

        expect(() => register()).toThrow()
    })

    it("Should not throw if authentication is disabled and required variable is not set", () => {
        ;(authenticationEnabled as jest.Mock).mockReturnValue(false)

        // Unset an environment variable that is only required for authentication
        delete process.env[REQUIRED_FOR_AUTH_ENV_VARS[0]]

        expect(() => register()).not.toThrow()
    })

    it("Should not throw if optional variables are not set", () => {
        ;(authenticationEnabled as jest.Mock).mockReturnValue(false)

        // Clear all optional environment variables
        OPTIONAL_ENV_VARS.forEach((envVar) => {
            delete process.env[envVar]
        })

        // Spy on console.warn to suppress output during test
        const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

        expect(() => register()).not.toThrow()

        OPTIONAL_ENV_VARS.forEach((envVar) => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(envVar))
        })
    })
})

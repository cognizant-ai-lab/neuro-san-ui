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
import {register, REQUIRED_ENV_VARS} from "../../../instrumentation"

jest.mock("../../../../../packages/ui-common/const")

describe("instrumentation", () => {
    withStrictMocks()
    beforeEach(() => {
        ;(authenticationEnabled as jest.Mock).mockReturnValue(true)
    })
    it("should throw if env vars not set", () => {
        // Unset a required environment variable
        process.env[REQUIRED_ENV_VARS[0]] = undefined

        expect(() => register()).toThrow(Error)
    })

    it("Should not throw if authentication is disabled", () => {
        ;(authenticationEnabled as jest.Mock).mockReturnValue(false)

        // Unset a required environment variable
        process.env[REQUIRED_ENV_VARS[0]] = undefined

        expect(() => register()).not.toThrow()
    })

    it("should not throw if env vars are set", () => {
        // Set all required environment variables
        REQUIRED_ENV_VARS.forEach((envVar) => {
            process.env[envVar] = "test_value"
        })

        expect(() => register()).not.toThrow()
    })
})

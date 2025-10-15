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

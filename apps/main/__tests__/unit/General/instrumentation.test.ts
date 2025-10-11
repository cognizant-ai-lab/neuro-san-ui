/*
Tests for instrumentation.ts NextJS startup file.
 */

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {register, REQUIRED_ENV_VARS} from "../../../instrumentation"

jest.mock("../../../../../packages/ui-common/const", () => ({
    ENABLE_AUTHENTICATION: true,
}))

describe("instrumentation", () => {
    withStrictMocks()

    it("should throw if env vars not set", () => {
        // Unset a required environment variable
        process.env[REQUIRED_ENV_VARS[0]] = undefined

        expect(() => register()).toThrow(Error)
    })

    it("should not throw if env vars are set", () => {
        // Set all required environment variables
        REQUIRED_ENV_VARS.forEach((envVar) => {
            process.env[envVar] = "test_value"
        })

        expect(() => register()).not.toThrow()
    })
})

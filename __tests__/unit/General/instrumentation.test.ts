/*
Tests for instrumentation.ts NextJS startup file.
 */

import {register} from "../../../instrumentation"
import {withStrictMocks} from "../../common/strictMocks"

describe("instrumentation", () => {
    withStrictMocks()

    it("should throw if env vars not set", () => {
        expect(() => register()).toThrow(Error)
    })
})

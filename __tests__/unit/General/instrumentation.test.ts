/*
Tests for instrumentation.ts NextJS startup file.
 */

import {register} from "../../../instrumentation"

describe("instrumentation", () => {
    it("should throw if env vars not set", () => {
        expect(() => register()).toThrow(Error)
    })
})

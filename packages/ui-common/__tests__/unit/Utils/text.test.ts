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

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {extractId, hashString} from "../../../utils/text"

describe("removeLast", () => {
    withStrictMocks()

    it("should handle prescriptor models", () => {
        const modelId = "prescriptor-67fb86d3-9047-4ce0-0d42-4e3d3b0f715e-83_28"
        const modelType = "prescriptor"
        const result = extractId(modelId, modelType)
        expect(result).toBe("67fb86d3-9047-4ce0-0d42-4e3d3b0f715e")
    })

    it("should return an empty string if the modelType is not in the modelId", () => {
        const modelId = "predictor-67fb86d3-9047-4ce0-0d42-4e3d3b0f715e-83_28"
        const modelType = "prescriptor"
        const result = extractId(modelId, modelType)
        expect(result).toBe("")
    })

    it("should handle rio models", () => {
        const modelId = "rio-67fb86d3-9047-4ce0-0d42-4e3d3b0f715e-Survived"
        const modelType = "rio"
        const result = extractId(modelId, modelType)
        expect(result).toBe("67fb86d3-9047-4ce0-0d42-4e3d3b0f715e")
    })
})

describe("hashString", () => {
    withStrictMocks()
    it("should return a stable hash for a given string", () => {
        const input = "example"
        const result = hashString(input)
        expect(result).toBe("11583576d173ad")
    })

    it("should return different hashes for different strings", () => {
        const input1 = "example1"
        const input2 = "example2"
        const result1 = hashString(input1)
        const result2 = hashString(input2)
        expect(result1).not.toBe(result2)
    })

    it("should return the same hash for the same string", () => {
        const input = "example"
        const result1 = hashString(input)
        const result2 = hashString(input)
        expect(result1).toBe(result2)
    })

    it("should handle an empty string", () => {
        const input = ""
        const result = hashString(input)
        expect(result).toBe("0bdcb81aee8d83")
    })

    it("should handle a very long string", () => {
        const input = "a".repeat(1000)
        const result = hashString(input)
        expect(result).toBe("1c0002518a359e")
    })

    it("should treat a missing code point as zero", () => {
        vi.spyOn(String.prototype, "codePointAt").mockReturnValueOnce(undefined)

        // Same as hashing a null character, whose code point is 0
        expect(hashString("a")).toBe(hashString("\0"))
    })
})

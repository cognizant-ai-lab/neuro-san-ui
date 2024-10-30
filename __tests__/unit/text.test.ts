import {extractId, hashString} from "../../utils/text"

describe("removeLast", () => {
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
    it("should return a valid MD5 hash for a given string", () => {
        const input = "example"
        const result = hashString(input)
        expect(result).toBe("1a79a4d60de6718e8e5b326e338ae533")
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
        expect(result).toBe("d41d8cd98f00b204e9800998ecf8427e")
    })

    it("should handle a very long string", () => {
        const input = "a".repeat(1000)
        const result = hashString(input)
        expect(result).toBe("cabe45dcc9ae5b66ba86600cca6b8ba8")
    })
})

import {extractId} from "../../utils/text"

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

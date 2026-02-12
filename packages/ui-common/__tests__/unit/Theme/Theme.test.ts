import {adjustBrightness} from "../../../Theme/Theme"

describe("adjustBrightness", () => {
    it("returns the same color if the input is not a valid hex color", () => {
        expect(adjustBrightness("invalid", 20)).toBe("invalid")
        expect(adjustBrightness("#12345", 20)).toBe("#12345")
        expect(adjustBrightness("123456", 20)).toBe("123456")
    })

    it("correctly adjusts brightness for a 6-character hex color", () => {
        expect(adjustBrightness("#000000", 50)).toBe("#7f7f7f")
        expect(adjustBrightness("#ffffff", -50)).toBe("#808080")
    })

    it("correctly adjusts brightness for a 3-character hex color", () => {
        expect(adjustBrightness("#000", 50)).toBe("#7f7f7f")
        expect(adjustBrightness("#fff", -50)).toBe("#808080")
    })

    it("handles edge cases for brightness adjustment", () => {
        expect(adjustBrightness("#000000", 100)).toBe("#ffffff")
        expect(adjustBrightness("#ffffff", -100)).toBe("#000000")
        expect(adjustBrightness("#123456", 0)).toBe("#123456")
    })

    it("clamps RGB values to valid ranges", () => {
        expect(adjustBrightness("#ff0000", 100)).toBe("#ffffff")
        expect(adjustBrightness("#00ff00", -200)).toBe("#000000")
    })
})

import {Theme} from "@mui/material"

import {getZIndex} from "../../../utils/zIndexLayers"

describe("zIndexLayers", () => {
    const fakeTheme = {zIndex: {modal: 1300, drawer: 1200}} as unknown as Theme

    it("returns default z-index for unknown layer", () => {
        expect(getZIndex(0, fakeTheme)).toBe(500)
    })

    it("returns default z-index for layer 1", () => {
        expect(getZIndex(1, fakeTheme)).toBe(500)
    })

    it("returns average for layer 2", () => {
        expect(getZIndex(2, fakeTheme)).toBe((1300 + 1200) / 2)
    })
})

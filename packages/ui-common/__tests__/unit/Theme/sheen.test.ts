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

import {createTheme} from "@mui/material/styles"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {
    getSheen,
    glassSurface,
    gradientBorder,
    SHEEN_DARK,
    SHEEN_LIGHT,
    SHEEN_RADIUS_SURFACE,
    spinningBorder,
    unbrandedPalette,
} from "../../../Theme/sheen"

describe("sheen helpers", () => {
    withStrictMocks()

    const theme = createTheme()

    it("gradientBorder uses the default surface radius, width and opacity", () => {
        const border = gradientBorder(theme)
        expect(border["&::before"].borderRadius).toBe(`${SHEEN_RADIUS_SURFACE}px`)
        expect(border["&::before"].padding).toBe("1px")
        expect(border["&::before"].opacity).toBe(0.7)
    })

    it("gradientBorder honours explicit radius, width and opacity", () => {
        const border = gradientBorder(theme, 8, 3, 0.2)
        expect(border["&::before"].borderRadius).toBe("8px")
        expect(border["&::before"].padding).toBe("3px")
        expect(border["&::before"].opacity).toBe(0.2)
    })

    it("spinningBorder animates the border", () => {
        expect(spinningBorder(theme)["&::before"].animation).toContain("sheenSpin")
        expect(spinningBorder(theme, 4, 2)["&::before"].borderRadius).toBe("4px")
    })

    it("unbrandedPalette resets text and background variables per color scheme", () => {
        const vars = unbrandedPalette(createTheme({colorSchemes: {light: true, dark: true}, cssVariables: true}))
        expect(vars["--mui-palette-text-primary"]).toBe(SHEEN_DARK.text.primary)
        expect(vars["--mui-palette-background-paperChannel"]).toBe("17 16 28")
        const light = Object.values(vars).find((value) => typeof value === "object") as Record<string, string>
        expect(light["--mui-palette-text-primary"]).toBe(SHEEN_LIGHT.text.primary)
        expect(light["--mui-palette-text-primaryChannel"]).toBe("18 16 31")
    })

    it("glassSurface is a tinted fill with no backdrop blur", () => {
        expect(glassSurface(theme).backgroundColor).toBe(getSheen(theme).glassBg)
        expect(glassSurface(theme)).not.toHaveProperty("backdropFilter")
        expect(glassSurface(theme, 5).borderRadius).toBe("5px")
    })
})

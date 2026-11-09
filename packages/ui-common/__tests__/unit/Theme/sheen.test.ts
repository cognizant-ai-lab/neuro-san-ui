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
    glassSurface,
    gradientBorder,
    SHEEN_RADIUS_SURFACE,
    spinningBorder,
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

    it("glassSurface has a backdrop blur", () => {
        expect(glassSurface(theme).backdropFilter).toContain("blur")
        expect(glassSurface(theme, 5).borderRadius).toBe("5px")
    })
})

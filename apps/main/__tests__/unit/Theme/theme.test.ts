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

/*
Tests for the main app theme: color schemes, branding overrides and the MuiButton style overrides.
 */

import {createTheme, CssVarsTheme, Theme} from "@mui/material/styles"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {SHEEN_DARK, SHEEN_LIGHT} from "../../../../../packages/ui-common/Theme/sheen"
import {COLOR_SCHEME_ATTRIBUTE, createAppTheme} from "../../../theme"

// MUI types the override callbacks as broad unions (style object | callback), so narrow them to the
// callback signatures we actually use here rather than reaching for `any`.
type RootStyleFn = (props: {ownerState: {variant?: string}}) => Record<string, unknown>
type ButtonVariant = {props: {variant: string}; style: (props: {theme: Theme}) => Record<string, unknown>}

const getMuiButton = () => {
    const theme = createAppTheme("", "", "")
    return theme.components?.MuiButton
}

describe("createAppTheme MuiButton overrides", () => {
    withStrictMocks()

    describe("root hover override", () => {
        const root = getMuiButton()?.styleOverrides?.root as unknown as RootStyleFn

        it("suppresses the hover background for non-contained buttons", () => {
            expect(root({ownerState: {variant: "outlined"}})).toEqual({
                "&:hover": {backgroundColor: "transparent"},
            })
            expect(root({ownerState: {variant: "text"}})).toEqual({
                "&:hover": {backgroundColor: "transparent"},
            })
        })

        it("leaves contained buttons with their default hover so text stays legible", () => {
            expect(root({ownerState: {variant: "contained"}})).toEqual({})
        })
    })

    describe("outlined dark-mode variant", () => {
        const variant = getMuiButton()?.variants?.[0] as unknown as ButtonVariant

        it("targets the outlined variant", () => {
            expect(variant.props).toEqual({variant: "outlined"})
        })

        it("forces white text and borders in dark mode", () => {
            const darkTheme = createTheme({palette: {mode: "dark"}})
            expect(variant.style({theme: darkTheme})).toEqual({
                color: darkTheme.palette.common.white,
                borderColor: darkTheme.palette.common.white,
                "&:hover": {borderColor: darkTheme.palette.common.white},
            })
        })

        it("applies no overrides in light mode", () => {
            const lightTheme = createTheme({palette: {mode: "light"}})
            expect(variant.style({theme: lightTheme})).toEqual({})
        })
    })
})

describe("createAppTheme color schemes", () => {
    withStrictMocks()

    // With cssVariables enabled, createTheme returns a CSS-vars theme; the public Theme type doesn't expose its fields
    const createVarsTheme = (...args: Parameters<typeof createAppTheme>) =>
        createAppTheme(...args) as unknown as CssVarsTheme

    it("enables CSS theme variables keyed on the color scheme attribute, defaulting to dark", () => {
        const theme = createVarsTheme()
        expect(theme.colorSchemeSelector).toContain(COLOR_SCHEME_ATTRIBUTE)
        expect(theme.defaultColorScheme).toBe("dark")
        expect(theme.vars).toBeDefined()
    })

    it("builds both schemes from the sheen tokens", () => {
        const theme = createVarsTheme()
        const dark = theme.colorSchemes.dark?.palette
        const light = theme.colorSchemes.light?.palette

        expect(dark?.primary.main).toBe(SHEEN_DARK.primary)
        expect(dark?.background.default).toBe(SHEEN_DARK.background.default)
        expect(dark?.text.primary).toBe(SHEEN_DARK.text.primary)
        expect(dark?.sheen.glassBg).toBe(SHEEN_DARK.sheen.glassBg)

        expect(light?.primary.main).toBe(SHEEN_LIGHT.primary)
        expect(light?.background.default).toBe(SHEEN_LIGHT.background.default)
        expect(light?.text.primary).toBe(SHEEN_LIGHT.text.primary)
        expect(light?.sheen.glassBg).toBe(SHEEN_LIGHT.sheen.glassBg)
    })

    it("lets user branding override text and background colors in both schemes", () => {
        const theme = createVarsTheme("#111111", "#222222", "#333333")

        for (const scheme of ["dark", "light"] as const) {
            const palette = theme.colorSchemes[scheme]?.palette
            expect(palette?.text.primary).toBe("#111111")
            expect(palette?.text.secondary).toBe("#222222")
            expect(palette?.background.default).toBe("#333333")
            // Accent colors are not affected by branding
            expect(palette?.primary.main).toBe(scheme === "dark" ? SHEEN_DARK.primary : SHEEN_LIGHT.primary)
        }
    })

    it("uses the signature gradient for contained primary buttons", () => {
        const variants = createAppTheme().components?.MuiButton?.variants as unknown as ButtonVariant[]
        const contained = variants.find(
            (v) => v.props.variant === "contained" && (v.props as {color?: string}).color === "primary"
        )
        const style = contained?.style({theme: createAppTheme()})
        expect(style?.["backgroundImage"]).toMatch(/^linear-gradient\(/u)
    })
})

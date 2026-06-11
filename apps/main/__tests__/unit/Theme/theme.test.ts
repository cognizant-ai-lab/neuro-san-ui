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
Tests for the main app theme, focused on the MuiButton style overrides.
 */

import {createTheme, Theme} from "@mui/material/styles"

import {createAppTheme} from "../../../theme"

// MUI types the override callbacks as broad unions (style object | callback), so narrow them to the
// callback signatures we actually use here rather than reaching for `any`.
type RootStyleFn = (props: {ownerState: {variant?: string}}) => Record<string, unknown>
type ButtonVariant = {props: {variant: string}; style: (props: {theme: Theme}) => Record<string, unknown>}

const getMuiButton = () => {
    const theme = createAppTheme("", "", "")
    return theme.components?.MuiButton
}

describe("createAppTheme MuiButton overrides", () => {
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

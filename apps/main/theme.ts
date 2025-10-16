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

// Main app theme.
import {createTheme} from "@mui/material"

// These are the main brand colors. For now they are repeated in globals.css but we'll get rid of that eventually.
export const BRAND_COLORS = {
    "bs-primary": "#000048",
    "bs-primary-rgb": "0, 0, 72",
    "bs-secondary": "#2f78c4",
    "bs-red": "#b81f2d",
    "bs-yellow": "#e9c71d",
    "bs-orange": "#ff9800",
    "bs-green": "#2db81f",
    "bs-black": "#000048", // same as bs-primary
    "bs-dark-mode-dim": "#161e27",
    "bs-white": "#ffffff",
    "bs-gray-background": "#fafafa",
    "bs-gray-lightest": "#f5f5f2",
    "bs-gray-lighter": "#e8e8e6",
    "bs-gray-light": "#d0d0ce",
    "bs-gray-medium": "#97999b",
    "bs-gray-medium-dark": "#808080",
    "bs-gray-dark": "#53565a",
    "bs-accent1-light": "#85a0f9",
    "bs-accent1-medium": "#7373d8",
    "bs-accent1-dark": "#2e308e",
    "bs-accent2-light": "#92bbe6",
    "bs-accent2-medium": "#6aa2dc",
    "bs-accent2-dark": "#2f78c4", // same as bs-secondary
    "bs-accent3-light": "#97f5f7",
    "bs-accent3-medium": "#26efe9",
    "bs-accent3-dark": "#06c7cc",
    "bs-success": "#2db81f", // same as bs-green
    "bs-info": "#26efe9", // same as bs-accent3-medium
    "bs-warning": "#ff9800", // same as bs-orange
    "bs-danger": "#b81f2d", // same as bs-red
}

/**
 * This is the main theme for the app. It is used by the MUI ThemeProvider. It exists to override some defaults in MUI
 * to ease our migration to that library, from a plethora of other libraries that we were using previously.
 */
export const APP_THEME = createTheme({
    palette: {
        mode: "light", // initial mode, app will override at runtime if needed
        background: {
            default: "var(--bs-white)", // initial background
        },
        primary: {
            main: BRAND_COLORS["bs-primary"],
        },
        secondary: {
            main: BRAND_COLORS["bs-secondary"],
        },
        error: {
            main: BRAND_COLORS["bs-danger"],
        },
        warning: {
            main: BRAND_COLORS["bs-warning"],
        },
        info: {
            main: BRAND_COLORS["bs-info"],
        },
        success: {
            main: BRAND_COLORS["bs-success"],
        },
        text: {
            primary: BRAND_COLORS["bs-primary"],
            secondary: BRAND_COLORS["bs-gray-medium-dark"],
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    "&:hover": {
                        // TODO: May still want this for some buttons like "Cancel" in the modals,
                        // but it was causing issues with icons.
                        backgroundColor: "transparent",
                    },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: "var(--bs-border-radius)",
                },
            },
        },
    },
    typography: {
        // Initially just force MUI to use our corporate font.
        fontFamily: "var(--bs-body-font-family)",

        // Undo MUI's urge to upper case everything
        button: {
            textTransform: "none",
        },

        h3: {
            fontSize: "2rem",
            fontWeight: 400,
            marginBottom: "0.75rem",
        },
    },
})

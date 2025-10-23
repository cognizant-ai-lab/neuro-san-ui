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

// Fallback color if CSS variable not found so we know something is up
const DEFAULT_COLOR = "#97999b"

// Cached root styles to avoid repeated lookups
let cachedRootStyles: CSSStyleDeclaration | null = null

// Function to get the root styles from the document
// Caches the result for future calls
const getRootStyles = (): CSSStyleDeclaration | null => {
    if (typeof window === "undefined" || typeof document === "undefined" || typeof getComputedStyle !== "function") {
        return null
    }
    if (!cachedRootStyles) {
        cachedRootStyles = getComputedStyle(document.documentElement)
    }
    return cachedRootStyles
}

/**
 * Helper to get CSS variable value from :root styles. Workaround for MUI not resolving CSS variables in themes.
 * @param variableName - The name of the CSS variable to retrieve (e.g., "--bs-primary").
 * @returns The resolved CSS variable value, or a default gray color if not found.
 */
export const cssVar = (variableName: string): string => {
    const rootStyles = getRootStyles()
    return rootStyles?.getPropertyValue(variableName).trim() || DEFAULT_COLOR
}

// Define the default palette used in both light and dark themes
export const DEFAULT_PALETTE = {
    primary: {
        main: cssVar("--bs-primary"),
    },
    secondary: {
        main: cssVar("--bs-secondary"),
    },
    error: {
        main: cssVar("--bs-danger"),
    },
    warning: {
        main: cssVar("--bs-red"),
    },
    info: {
        main: cssVar("--bs-info"),
    },
    success: {
        main: cssVar("--bs-success"),
    },
    text: {
        primary: cssVar("--bs-primary"),
        secondary: cssVar("--bs-gray-medium-dark"),
    },
}

/**
 * This is the main theme for the app. It is used by the MUI ThemeProvider. It supplies light and dark themes
 * using custom colors defined in globals.css.
 */
export const createAppTheme = () =>
    createTheme({
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
        colorSchemes: {
            dark: {
                palette: {
                    ...DEFAULT_PALETTE,

                    background: {
                        default: cssVar("--bs-dark-mode-dim"),
                    },
                    text: {
                        primary: cssVar("--bs-white"),
                        secondary: cssVar("--bs-gray-light"),
                    },
                },
            },
            light: {
                palette: {
                    ...DEFAULT_PALETTE,
                    background: {
                        default: cssVar("--bs-white"),
                    },
                    text: {
                        primary: cssVar("--bs-primary"),
                        secondary: cssVar("--bs-gray-medium-dark"),
                    },
                },
            },
        },
    })

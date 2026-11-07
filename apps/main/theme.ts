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

// Main app theme: "sheen" look — iridescent accents, specular glass, animated aurora. Dark by default.

import {createTheme, Theme} from "@mui/material/styles"

import {
    auroraBackground,
    getSheen,
    glassSurface,
    glowShadow,
    gradientBorder,
    GRAIN_TEXTURE,
    SHEEN_DARK,
    SHEEN_EASE,
    SHEEN_FONT_BODY,
    SHEEN_FONT_DISPLAY,
    SHEEN_LIGHT,
    SHEEN_RADIUS,
    SHEEN_RADIUS_SURFACE,
    sheenGradient,
    shimmerOnHover,
} from "../../packages/ui-common/Theme/sheen"
import {adjustBrightness} from "../../packages/ui-common/Theme/Theme"

// Attribute MUI sets on <html> for the active scheme. Must match InitColorSchemeScript in _document.tsx.
export const COLOR_SCHEME_ATTRIBUTE = "data-mui-color-scheme"

// White text on top of the deep indigo/purple/blue gradient, in both schemes, for contrast
const ON_GRADIENT_TEXT = "#FFFFFF"

type SchemeTokens = typeof SHEEN_DARK | typeof SHEEN_LIGHT

const buildPalette = (tokens: SchemeTokens, primary: string, secondary: string, background: string) => ({
    primary: {main: tokens.primary, contrastText: ON_GRADIENT_TEXT},
    secondary: {main: tokens.secondary, contrastText: ON_GRADIENT_TEXT},
    error: {main: tokens.error},
    warning: {main: tokens.warning},
    info: {main: tokens.info},
    success: {main: tokens.success},
    divider: tokens.divider,
    background: {
        default: background || tokens.background.default,
        paper: background ? adjustBrightness(background, tokens === SHEEN_DARK ? 5 : -5) : tokens.background.paper,
    },
    text: {
        primary: primary || tokens.text.primary,
        secondary: secondary || tokens.text.secondary,
    },
    sheen: {...tokens.sheen},
})

const displayHeading = (fontSize: string, fontWeight = 500) => ({
    fontFamily: SHEEN_FONT_DISPLAY,
    fontSize,
    fontWeight,
    letterSpacing: "-0.025em",
    lineHeight: 1.05,
})

/**
 * This is the main theme for the app. It is used by the MUI ThemeProvider. It supplies light and dark color schemes
 * built from the sheen tokens; user branding colors (from Settings) override text and background colors.
 * @param primary Optional branding override for primary text color
 * @param secondary Optional branding override for secondary text color
 * @param background Optional branding override for the page background color
 */
export const createAppTheme = (primary?: string | null, secondary?: string | null, background?: string | null) =>
    createTheme({
        cssVariables: {colorSchemeSelector: COLOR_SCHEME_ATTRIBUTE},
        defaultColorScheme: "dark",
        colorSchemes: {
            dark: {palette: buildPalette(SHEEN_DARK, primary ?? "", secondary ?? "", background ?? "")},
            light: {palette: buildPalette(SHEEN_LIGHT, primary ?? "", secondary ?? "", background ?? "")},
        },
        shape: {borderRadius: SHEEN_RADIUS},
        typography: {
            fontFamily: SHEEN_FONT_BODY,
            h1: displayHeading("clamp(3rem, 7vw, 5.5rem)", 400),
            h2: displayHeading("clamp(2.25rem, 4.5vw, 3.5rem)", 400),
            h3: {...displayHeading("2.25rem", 400), marginBottom: "0.75rem"},
            h4: displayHeading("1.6rem"),
            h5: {fontWeight: 650, letterSpacing: "-0.015em"},
            h6: {fontWeight: 650, letterSpacing: "-0.01em"},
            overline: {fontWeight: 600, letterSpacing: "0.14em"},
            // Undo MUI's urge to upper case everything
            button: {textTransform: "none", fontWeight: 600, letterSpacing: "0"},
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: (theme: Theme) => ({
                    body: {
                        backgroundColor: theme.vars?.palette.background.default,
                        color: theme.vars?.palette.text.primary,
                        fontFamily: SHEEN_FONT_BODY,
                        fontFeatureSettings: '"cv11", "ss01", "ss03"',
                        isolation: "isolate",
                    },
                    // Aurora mesh behind everything. Deliberately static: a drifting, blurred full-screen layer
                    // repaints every frame and forces all the glass (backdrop-filter) above it to re-blur, which pins
                    // the CPU when the browser renders without a GPU. The radial gradients are already soft, so no
                    // blur filter is needed.
                    "body::before": {
                        content: '""',
                        position: "fixed",
                        inset: 0,
                        zIndex: -2,
                        backgroundImage: auroraBackground(theme),
                        pointerEvents: "none",
                    },
                    // Film grain over the aurora so the gradients don't band and surfaces feel tactile
                    "body::after": {
                        content: '""',
                        position: "fixed",
                        inset: 0,
                        zIndex: -1,
                        backgroundImage: GRAIN_TEXTURE,
                        opacity: 0.06,
                        mixBlendMode: "overlay",
                        pointerEvents: "none",
                    },
                    "::selection": {
                        backgroundColor: getSheen(theme).glow,
                    },
                    "*": {
                        scrollbarWidth: "thin",
                        scrollbarColor: `${getSheen(theme).glassBorder} transparent`,
                    },
                    ":focus-visible": {
                        outline: `2px solid ${theme.vars?.palette.primary.main}`,
                        outlineOffset: 3,
                    },
                    a: {
                        color: theme.vars?.palette.primary.main,
                        fontWeight: 600,
                        transition: "color 0.2s ease",
                        textDecoration: "none",
                        "&:hover": {
                            color: theme.vars?.palette.secondary.main,
                        },
                    },
                }),
            },
            MuiButton: {
                defaultProps: {disableElevation: true},
                styleOverrides: {
                    root: ({ownerState}) => ({
                        // Suppress the hover background for text/outlined buttons (it was causing
                        // issues with icons). Contained buttons keep their default hover so their
                        // text stays legible against the filled background.
                        ...(ownerState.variant !== "contained" && {
                            "&:hover": {
                                backgroundColor: "transparent",
                            },
                        }),
                    }),
                },
                variants: [
                    {
                        // Keep outlined buttons legible in dark mode by forcing white text and
                        // border colours. In light mode the theme's default styles are used unchanged.
                        props: {variant: "outlined"},
                        style: ({theme}) =>
                            theme.applyStyles("dark", {
                                color: theme.palette.common.white,
                                borderColor: theme.palette.common.white,
                                "&:hover": {borderColor: theme.palette.common.white},
                            }),
                    },
                    {
                        // Signature gradient pill for primary contained buttons
                        props: {variant: "contained", color: "primary"},
                        style: ({theme}) => ({
                            ...shimmerOnHover(),
                            backgroundImage: sheenGradient(theme),
                            backgroundSize: "160% 100%",
                            backgroundPosition: "0% 50%",
                            color: ON_GRADIENT_TEXT,
                            borderRadius: 999,
                            paddingInline: "1.25em",
                            boxShadow: [
                                `0 6px 20px -8px ${getSheen(theme).glow}`,
                                "inset 0 1px 0 rgba(255, 255, 255, 0.35)",
                            ].join(", "),
                            transition: [
                                `box-shadow 0.3s ${SHEEN_EASE}`,
                                `transform 0.3s ${SHEEN_EASE}`,
                                `background-position 0.6s ${SHEEN_EASE}`,
                            ].join(", "),
                            "&:hover": {
                                boxShadow: glowShadow(theme),
                                transform: "translateY(-2px)",
                                backgroundPosition: "100% 50%",
                            },
                            "&:active": {transform: "translateY(0) scale(0.98)"},
                            "&.Mui-disabled": {
                                backgroundImage: "none",
                                boxShadow: "none",
                            },
                        }),
                    },
                    {
                        // Outlined buttons pick up a primary-colored border on hover
                        props: {variant: "outlined"},
                        style: ({theme}) => ({
                            borderRadius: 999,
                            backdropFilter: "blur(12px)",
                            backgroundColor: getSheen(theme).glassBg,
                            transition: `border-color 0.2s ease, box-shadow 0.3s ${SHEEN_EASE}`,
                            "&:hover": {
                                borderColor: theme.vars?.palette.primary.main,
                                boxShadow: `0 0 24px -8px ${getSheen(theme).glow}`,
                            },
                        }),
                    },
                ],
            },
            MuiPaper: {
                styleOverrides: {
                    // Drop MUI's dark-mode elevation overlay; surfaces are flat + hairline instead
                    root: {backgroundImage: "none"},
                    outlined: ({theme}) => ({borderColor: getSheen(theme).glassBorder}),
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: ({theme}) => {
                        const border = gradientBorder(theme, SHEEN_RADIUS_SURFACE, 1, 0)
                        return {
                            ...glassSurface(theme),
                            ...border,
                            overflow: "visible",
                            transition: `transform 0.35s ${SHEEN_EASE}, box-shadow 0.35s ${SHEEN_EASE}`,
                            "&::before": {...border["&::before"], transition: "opacity 0.35s ease"},
                            "&:hover": {transform: "translateY(-3px)", boxShadow: glowShadow(theme, 40)},
                            "&:hover::before": {opacity: 0.9},
                        }
                    },
                },
            },
            MuiPopover: {
                styleOverrides: {
                    paper: ({theme}) => ({...glassSurface(theme, SHEEN_RADIUS), boxShadow: theme.shadows[8]}),
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: ({theme}) => ({...glassSurface(theme, SHEEN_RADIUS), boxShadow: theme.shadows[8]}),
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: ({theme}) => ({
                        ...glassSurface(theme),
                        ...gradientBorder(theme, SHEEN_RADIUS_SURFACE, 1, 0.55),
                        // Dialogs need to be more opaque than other glass to keep text readable
                        backgroundColor: theme.vars?.palette.background.paper,
                        boxShadow: `0 40px 120px -30px ${getSheen(theme).glow}, 0 30px 80px -20px rgba(0, 0, 0, 0.6)`,
                    }),
                },
            },
            MuiBackdrop: {
                styleOverrides: {
                    root: ({ownerState}) =>
                        ownerState.invisible
                            ? {}
                            : {backdropFilter: "blur(10px) saturate(120%)", backgroundColor: "rgba(8, 7, 6, 0.5)"},
                },
            },
            MuiAppBar: {
                defaultProps: {elevation: 0, color: "transparent"},
                styleOverrides: {
                    root: ({theme}) => ({
                        ...glassSurface(theme, 0),
                        borderWidth: "0 0 1px 0",
                    }),
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: ({theme}) => ({
                        borderRadius: SHEEN_RADIUS,
                        transition: "box-shadow 0.2s ease",
                        "& .MuiOutlinedInput-notchedOutline": {borderColor: getSheen(theme).glassBorder},
                        "&:hover .MuiOutlinedInput-notchedOutline": {borderColor: theme.vars?.palette.text.secondary},
                        backgroundColor: getSheen(theme).glassBg,
                        backdropFilter: "blur(12px)",
                        "&.Mui-focused": {
                            boxShadow: `0 0 0 4px ${getSheen(theme).tint}, 0 0 32px -8px ${getSheen(theme).glow}`,
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: theme.vars?.palette.primary.main,
                            borderWidth: 1,
                        },
                    }),
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: ({theme}) => ({
                        ...glassSurface(theme, 8),
                        color: theme.vars?.palette.text.primary,
                        fontSize: "0.7rem",
                        boxShadow: theme.shadows[4],
                    }),
                    arrow: ({theme}) => ({color: getSheen(theme).glassBg}),
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {borderRadius: 999, fontWeight: 500},
                    filled: ({theme}) => ({
                        "&.MuiChip-colorDefault": {backgroundColor: getSheen(theme).tint},
                    }),
                    outlined: ({theme}) => ({
                        "&.MuiChip-colorDefault": {borderColor: getSheen(theme).glassBorder},
                    }),
                },
            },
            MuiTabs: {
                styleOverrides: {
                    indicator: ({theme}) => ({
                        backgroundImage: sheenGradient(theme, 90),
                        height: 3,
                        borderRadius: 3,
                        boxShadow: `0 0 12px ${getSheen(theme).glow}`,
                    }),
                },
            },
            MuiSwitch: {
                styleOverrides: {
                    switchBase: ({theme}) => ({
                        "&.Mui-checked + .MuiSwitch-track": {
                            backgroundImage: sheenGradient(theme, 90),
                            opacity: 1,
                        },
                    }),
                },
            },
            MuiLinearProgress: {
                styleOverrides: {
                    root: ({theme}) => ({borderRadius: 999, backgroundColor: getSheen(theme).tint}),
                    bar: ({theme}) => ({
                        backgroundImage: sheenGradient(theme, 90),
                        borderRadius: 999,
                        boxShadow: `0 0 12px ${getSheen(theme).glow}`,
                    }),
                },
            },
            MuiDivider: {
                styleOverrides: {
                    root: ({theme}) => ({borderColor: theme.vars?.palette.divider}),
                },
            },
            MuiStepIcon: {
                styleOverrides: {
                    root: ({theme}) =>
                        theme.applyStyles("dark", {
                            // Show completed Stepper steps in white
                            "&.Mui-completed": {
                                color: theme.palette.common.white,
                            },
                        }),
                },
            },
        },
    })

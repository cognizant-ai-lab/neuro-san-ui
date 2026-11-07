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

// "Sheen" design tokens: deep blue-black / lavender-white surfaces, an iridescent indigo → purple → electric-blue
// accent, luminous
// glows, specular frosted glass with gradient hairlines, animated aurora mesh + film grain.
// The tokens live in the MUI palette (palette.sheen) so that, with CSS theme variables enabled, they are emitted as
// --mui-palette-sheen-* variables and flip automatically with the active color scheme.
// Keyframes referenced here (sheenSpin, sheenShimmer, sheenFlow, auroraDrift) and the --sheen-angle custom property
// are defined in apps/main/styles/globals.css.

import type {CSSObject, Theme} from "@mui/material/styles"

export interface SheenPalette {
    // Accent glow color (focus rings, hover halos)
    glow: string
    // Translucent background for frosted-glass surfaces
    glassBg: string
    // Hairline border for glass surfaces
    glassBorder: string
    // Specular highlight along the top edge of glass
    highlight: string
    // Stops of the signature iridescent gradient
    gradientStart: string
    gradientMid: string
    gradientEnd: string
    // Colors for the aurora background blobs
    auroraA: string
    auroraB: string
    auroraC: string
    // Soft tint for user chat bubbles, chips, etc.
    tint: string
}

declare module "@mui/material/styles" {
    interface Palette {
        sheen: SheenPalette
    }
    interface PaletteOptions {
        sheen?: Partial<SheenPalette>
    }
}

export const SHEEN_FONT_BODY =
    '"Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
export const SHEEN_FONT_DISPLAY = '"Newsreader Variable", "Newsreader", Georgia, "Times New Roman", serif'
export const SHEEN_FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'

// Radii (px)
export const SHEEN_RADIUS = 14
export const SHEEN_RADIUS_SURFACE = 22

// Shared easing for interactive motion
export const SHEEN_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

export const SHEEN_DARK = {
    background: {default: "#06060C", paper: "#11101C"},
    text: {primary: "#F2F0FF", secondary: "#A6A3C2"},
    primary: "#9D7BFF",
    secondary: "#6E9BFF",
    success: "#5EE6B0",
    warning: "#F5C66B",
    error: "#FF5D8F",
    info: "#6EC8FF",
    divider: "rgba(200, 190, 255, 0.09)",
    sheen: {
        glow: "rgba(140, 100, 255, 0.55)",
        glassBg: "rgba(14, 13, 28, 0.58)",
        glassBorder: "rgba(200, 190, 255, 0.11)",
        highlight: "rgba(255, 255, 255, 0.07)",
        gradientStart: "#6A4CFF",
        gradientMid: "#A64DFF",
        gradientEnd: "#3D7BFF",
        auroraA: "rgba(106, 76, 255, 0.42)",
        auroraB: "rgba(40, 110, 255, 0.36)",
        auroraC: "rgba(170, 70, 255, 0.26)",
        tint: "rgba(140, 100, 255, 0.16)",
    } satisfies SheenPalette,
} as const

export const SHEEN_LIGHT = {
    background: {default: "#F5F4FB", paper: "#FFFFFF"},
    text: {primary: "#12101F", secondary: "#56536D"},
    primary: "#5B3FE0",
    secondary: "#2F64D8",
    success: "#1C8763",
    warning: "#A06B14",
    error: "#D2336B",
    info: "#1F78C8",
    divider: "rgba(18, 16, 31, 0.08)",
    sheen: {
        glow: "rgba(91, 63, 224, 0.35)",
        glassBg: "rgba(255, 255, 255, 0.62)",
        glassBorder: "rgba(18, 16, 31, 0.08)",
        highlight: "rgba(255, 255, 255, 0.85)",
        gradientStart: "#6A4CFF",
        gradientMid: "#A64DFF",
        gradientEnd: "#3D7BFF",
        auroraA: "rgba(106, 76, 255, 0.24)",
        auroraB: "rgba(61, 123, 255, 0.22)",
        auroraC: "rgba(166, 77, 255, 0.18)",
        tint: "rgba(91, 63, 224, 0.10)",
    } satisfies SheenPalette,
} as const

/**
 * Returns the sheen palette from a theme, as CSS variable references when available (so values follow the active
 * color scheme without re-render), falling back to raw values, and finally to the dark defaults for themes that
 * don't define palette.sheen (e.g. consumers of ui-common with their own theme, or tests using a bare createTheme()).
 */
export const getSheen = (theme: Theme): SheenPalette =>
    (theme.vars?.palette as {sheen?: SheenPalette} | undefined)?.sheen ??
    (theme.palette as {sheen?: SheenPalette}).sheen ??
    (theme.palette.mode === "light" ? SHEEN_LIGHT.sheen : SHEEN_DARK.sheen)

/**
 * The signature iridescent gradient: indigo → purple → electric blue.
 */
export const sheenGradient = (theme: Theme, angle = 135): string => {
    const sheen = getSheen(theme)
    return `linear-gradient(${angle}deg, ${sheen.gradientStart}, ${sheen.gradientMid} 55%, ${sheen.gradientEnd})`
}

/**
 * Conic version of the gradient, rotating with the animatable --sheen-angle property (see `spinningBorder`).
 */
export const sheenConic = (theme: Theme): string => {
    const sheen = getSheen(theme)
    return (
        `conic-gradient(from var(--sheen-angle, 0deg), ${sheen.gradientStart}, ${sheen.gradientMid}, ` +
        `${sheen.gradientEnd}, ${sheen.gradientStart})`
    )
}

/**
 * Multi-hue "aurora" mesh made of radial blobs. Layer it over background.default.
 */
export const auroraBackground = (theme: Theme): string => {
    const sheen = getSheen(theme)
    return [
        `radial-gradient(45% 40% at 12% 8%, ${sheen.auroraA}, transparent 70%)`,
        `radial-gradient(40% 38% at 88% 14%, ${sheen.auroraB}, transparent 70%)`,
        `radial-gradient(50% 45% at 70% 92%, ${sheen.auroraC}, transparent 70%)`,
        `radial-gradient(35% 30% at 20% 85%, ${sheen.auroraB}, transparent 70%)`,
    ].join(", ")
}

// Film grain (fractal noise), very low alpha. Adds texture to large flat areas so gradients don't band.
export const GRAIN_TEXTURE =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter " +
    "id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E" +
    "%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

/**
 * Hairline border painted with the iridescent gradient, via a masked ::before pseudo-element.
 * The host gets position: relative. Use for hero surfaces (dialogs, featured cards, focused inputs).
 */
export const gradientBorder = (theme: Theme, radius: number = SHEEN_RADIUS_SURFACE, width = 1, opacity = 0.7) => ({
    position: "relative" as const,
    "&::before": {
        content: '""',
        position: "absolute" as const,
        inset: 0,
        padding: `${width}px`,
        borderRadius: `${radius}px`,
        background: sheenGradient(theme),
        opacity,
        pointerEvents: "none" as const,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
    },
})

/**
 * Animated rotating iridescent border (for "live" elements: streaming chat input, active node, primary CTA).
 */
export const spinningBorder = (theme: Theme, radius: number = SHEEN_RADIUS_SURFACE, width = 1.5) => {
    const base = gradientBorder(theme, radius, width, 1)
    return {
        ...base,
        "&::before": {
            ...base["&::before"],
            background: sheenConic(theme),
            animation: "sheenSpin 4s linear infinite",
        },
    }
}

/**
 * Specular frosted-glass surface: translucent, heavily blurred and saturated, with a bright top edge highlight,
 * hairline border and soft depth shadow.
 */
export const glassSurface = (theme: Theme, radius: number = SHEEN_RADIUS_SURFACE): CSSObject => {
    const sheen = getSheen(theme)
    return {
        backgroundColor: sheen.glassBg,
        backgroundImage: `linear-gradient(180deg, ${sheen.highlight}, transparent 38%)`,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: `1px solid ${sheen.glassBorder}`,
        boxShadow: `inset 0 1px 0 ${sheen.highlight}, 0 10px 40px -12px rgba(0, 0, 0, 0.45)`,
        // Explicit px: a bare number would be multiplied by theme.shape.borderRadius when spread into sx
        borderRadius: `${radius}px`,
    }
}

/**
 * Text filled with the signature gradient (for display headings / highlighted words). Static on purpose: an infinite
 * background-position animation repaints the text every frame.
 */
export const gradientText = (theme: Theme): CSSObject => ({
    backgroundImage: sheenGradient(theme, 100),
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
})

/**
 * Luminous glow used for focus/hover on interactive elements.
 */
export const glowShadow = (theme: Theme, spread = 32): string => {
    const {glow} = getSheen(theme)
    return `0 0 0 1px ${glow}, 0 0 ${spread}px -4px ${glow}, 0 12px ${spread * 1.5}px -12px ${glow}`
}

/**
 * Light sweep that runs across an element on hover. Host needs overflow: hidden.
 */
export const shimmerOnHover = (): CSSObject => ({
    position: "relative",
    overflow: "hidden",
    isolation: "isolate",
    "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        zIndex: -1,
        background: "linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.45) 50%, transparent 70%)",
        transform: "translateX(-120%)",
        pointerEvents: "none",
    },
    "&:hover::after": {
        animation: "sheenShimmer 0.9s ease",
    },
})

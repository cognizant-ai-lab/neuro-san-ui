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

/**
 * Cursor "spotlight": a soft radial glow, tinted with the sheen accent, that follows the pointer inside a surface.
 * The pointer position is written to CSS custom properties (--spotlight-x / --spotlight-y) directly on the element,
 * so moving the pointer never re-renders React.
 */

import Box, {BoxProps} from "@mui/material/Box"
import {CSSObject, Theme} from "@mui/material/styles"
import {PointerEvent as ReactPointerEvent, useCallback} from "react"

import {getSheen} from "../../Theme/sheen"

const SPOTLIGHT_X_VAR = "--spotlight-x"
const SPOTLIGHT_Y_VAR = "--spotlight-y"
const SPOTLIGHT_OPACITY_VAR = "--spotlight-opacity"

/**
 * Hook returning pointer handlers that track the pointer inside the element they are attached to, via CSS variables.
 * Pair with `spotlightStyles` (or use the `Spotlight` component).
 */
export const useSpotlight = () => {
    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        const element = event.currentTarget
        const rect = element.getBoundingClientRect()
        element.style.setProperty(SPOTLIGHT_X_VAR, `${event.clientX - rect.left}px`)
        element.style.setProperty(SPOTLIGHT_Y_VAR, `${event.clientY - rect.top}px`)
        element.style.setProperty(SPOTLIGHT_OPACITY_VAR, "1")
    }, [])

    const onPointerLeave = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        event.currentTarget.style.setProperty(SPOTLIGHT_OPACITY_VAR, "0")
    }, [])

    return {onPointerMove, onPointerLeave}
}

/**
 * Styles painting the spotlight glow in an ::after pseudo-element. The host gets position: relative and
 * isolation: isolate so the glow sits under the content.
 * @param theme MUI theme (for the accent color)
 * @param size Radius of the glow, in px
 */
export const spotlightStyles = (theme: Theme, size = 280): CSSObject => {
    const sheen = getSheen(theme)
    return {
        position: "relative",
        isolation: "isolate",
        "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            zIndex: -1,
            borderRadius: "inherit",
            background:
                `radial-gradient(${size}px circle at var(${SPOTLIGHT_X_VAR}, 50%) var(${SPOTLIGHT_Y_VAR}, 50%), ` +
                `${sheen.tint}, transparent 70%)`,
            opacity: `var(${SPOTLIGHT_OPACITY_VAR}, 0)`,
            transition: "opacity 0.35s ease",
            pointerEvents: "none",
        },
    }
}

interface SpotlightProps extends BoxProps {
    // Radius of the glow, in px
    readonly size?: number
}

/**
 * Box that paints a pointer-following glow behind its children. Combine with glassSurface for a "lit glass" card.
 */
export const Spotlight = ({size = 280, sx, children, ...rest}: SpotlightProps) => {
    const handlers = useSpotlight()
    return (
        <Box
            {...rest}
            {...handlers}
            sx={[(theme: Theme) => spotlightStyles(theme, size), ...(Array.isArray(sx) ? sx : [sx])]}
        >
            {children}
        </Box>
    )
}

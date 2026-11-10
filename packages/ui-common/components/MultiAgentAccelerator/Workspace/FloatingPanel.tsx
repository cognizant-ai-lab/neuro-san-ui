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

import Box from "@mui/material/Box"
import {useTheme} from "@mui/material/styles"
import {motion, useReducedMotion} from "motion/react"
import {FC, ReactNode} from "react"

import {getSheen, glassSurface, gradientBorder, SHEEN_RADIUS_SURFACE} from "../../../Theme/sheen"

export interface FloatingPanelProps {
    readonly children: ReactNode
    /** Whether the hosting resizable panel is collapsed (e.g. zen mode). The card slides out and becomes inert. */
    readonly collapsed: boolean
    readonly id: string
    /**
     * Width (px) the card keeps while its panel is animating open/closed, so the content slides rather than squishes.
     */
    readonly minWidth: number
    /** Which edge of the workspace the card is docked to; it slides out towards that edge. */
    readonly side: "left" | "right"
    /** True while the hosting panel's size is animating (zen mode enter/exit) */
    readonly isTransitioning?: boolean
}

// Distance (px) the card travels when sliding out
const SLIDE_DISTANCE = 56

const PANEL_SPRING = {type: "spring", stiffness: 240, damping: 30, mass: 0.9} as const

/**
 * Floating specular-glass card that hosts a workspace side panel (sidebar or chat) over the full-bleed canvas.
 * Anchored to the inner edge of its panel, so when the panel collapses the card slides out towards the workspace
 * edge (with a fade) instead of being squashed.
 */
export const FloatingPanel: FC<FloatingPanelProps> = ({
    children,
    collapsed,
    id,
    isTransitioning = false,
    minWidth,
    side,
}) => {
    const theme = useTheme()
    const sheen = getSheen(theme)
    const reduceMotion = useReducedMotion()

    const isLeft = side === "left"
    const keepWidth = collapsed || isTransitioning

    return (
        <Box sx={{height: "100%", position: "relative", width: "100%"}}>
            <motion.div
                animate={
                    collapsed
                        ? {opacity: 0, x: isLeft ? -SLIDE_DISTANCE : SLIDE_DISTANCE, scale: 0.97}
                        : {opacity: 1, x: 0, scale: 1}
                }
                aria-hidden={collapsed || undefined}
                data-collapsed={collapsed}
                id={id}
                inert={collapsed}
                initial={false}
                style={{
                    bottom: 0,
                    pointerEvents: collapsed ? "none" : "auto",
                    position: "absolute",
                    top: 0,
                    transformOrigin: isLeft ? "left center" : "right center",
                    width: keepWidth ? `max(100%, ${minWidth}px)` : "100%",
                    // Anchor to the inner edge: overflow while collapsing goes towards the workspace edge
                    ...(isLeft ? {right: 0} : {left: 0}),
                }}
                transition={reduceMotion ? {duration: 0} : PANEL_SPRING}
            >
                <Box
                    sx={{
                        ...glassSurface(theme, SHEEN_RADIUS_SURFACE),
                        ...gradientBorder(theme, SHEEN_RADIUS_SURFACE, 1, 0.28),
                        border: 0,
                        boxShadow:
                            `inset 0 1px 0 ${sheen.highlight}, 0 0 0 1px ${sheen.glassBorder}, ` +
                            "0 30px 80px -24px rgba(0, 0, 0, 0.65), 0 8px 24px -12px rgba(0, 0, 0, 0.35)",
                        boxSizing: "border-box",
                        height: "100%",
                        overflow: "hidden",
                        width: "100%",
                    }}
                >
                    {children}
                </Box>
            </motion.div>
        </Box>
    )
}

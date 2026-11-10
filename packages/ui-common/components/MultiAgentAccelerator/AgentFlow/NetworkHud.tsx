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

import HubOutlinedIcon from "@mui/icons-material/HubOutlined"
import Box from "@mui/material/Box"
import {useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {AnimatePresence, motion, useReducedMotion} from "motion/react"
import {FC, ReactNode} from "react"

import {
    getSheen,
    glassSurface,
    gradientBorder,
    SHEEN_EASE,
    SHEEN_FONT_DISPLAY,
    sheenGradient,
    spinningBorder,
} from "../../../Theme/sheen"
import {getZIndex} from "../../../utils/zIndexLayers"

export type NetworkHudStatus = "idle" | "thinking" | "streaming"

export interface NetworkHudProps {
    readonly agentCount: number
    /** Horizontal offset (px) of the visible canvas center from the canvas center */
    readonly centerOffset: number
    /** Actions (Edit, Publish) shown to the right of the pill */
    readonly children?: ReactNode
    readonly id: string
    readonly networkDisplayName: string
    readonly status: NetworkHudStatus
    /** Distance (px) from the top of the canvas */
    readonly top: number
}

const STATUS_LABELS: Record<NetworkHudStatus, string> = {
    idle: "Idle",
    thinking: "Thinking",
    streaming: "Streaming",
}

const PILL_RADIUS = 999

/**
 * Three dots that ripple through the sheen gradient while the network is working.
 */
const ThinkingDots: FC<{readonly id: string}> = ({id}) => {
    const theme = useTheme()
    const reduceMotion = useReducedMotion()
    return (
        <Box
            aria-hidden={true}
            id={id}
            sx={{alignItems: "center", display: "inline-flex", gap: "3px"}}
        >
            {[0, 1, 2].map((i) => (
                <motion.span
                    animate={reduceMotion ? undefined : {opacity: [0.35, 1, 0.35], y: [0, -3, 0]}}
                    key={i}
                    style={{
                        backgroundImage: sheenGradient(theme),
                        backgroundSize: "300% 100%",
                        backgroundPosition: `${i * 50}% 50%`,
                        borderRadius: "50%",
                        display: "inline-block",
                        height: 6,
                        width: 6,
                    }}
                    transition={{duration: 1.1, ease: "easeInOut", repeat: Infinity, delay: i * 0.16}}
                />
            ))}
        </Box>
    )
}

/**
 * Floating top-center "mission control" HUD over the agent canvas: the current network's name in the display font,
 * its live status (idle / thinking / streaming) and how many agents it has. Edit / Publish actions sit beside it.
 */
export const NetworkHud: FC<NetworkHudProps> = ({
    agentCount,
    centerOffset,
    children,
    id,
    networkDisplayName,
    status: hudStatus,
    top: topPx,
}) => {
    const theme = useTheme()
    const themeVars = theme.vars ?? theme
    const sheen = getSheen(theme)
    const isBusy = hudStatus !== "idle"

    return (
        <Box
            id={`${id}-network-title-bar`}
            sx={{
                alignItems: "center",
                display: "flex",
                gap: 1,
                left: `calc(50% + ${centerOffset}px)`,
                maxWidth: "min(720px, 90%)",
                pointerEvents: "none",
                position: "absolute",
                top: `${topPx}px`,
                transform: "translateX(-50%)",
                transition: `left 0.55s ${SHEEN_EASE}, top 0.55s ${SHEEN_EASE}`,
                zIndex: getZIndex(2, theme),
            }}
        >
            <Box
                id={`${id}-hud`}
                role="status"
                aria-live="polite"
                aria-label={`${networkDisplayName}: ${STATUS_LABELS[hudStatus]}, ${agentCount} agents`}
                sx={{
                    ...glassSurface(theme, PILL_RADIUS),
                    ...(isBusy ? spinningBorder(theme, PILL_RADIUS, 1.5) : gradientBorder(theme, PILL_RADIUS, 1, 0.45)),
                    alignItems: "center",
                    animation: `sheenRise 0.6s ${SHEEN_EASE} both`,
                    border: 0,
                    boxShadow: isBusy
                        ? `inset 0 1px 0 ${sheen.highlight}, 0 0 36px -8px ${sheen.glow}`
                        : `inset 0 1px 0 ${sheen.highlight}, 0 18px 50px -18px rgba(0, 0, 0, 0.6)`,
                    display: "flex",
                    gap: 1.25,
                    minWidth: 0,
                    pointerEvents: "auto",
                    pl: 1.75,
                    pr: 1.25,
                    py: 0.6,
                    transition: `box-shadow 0.4s ${SHEEN_EASE}`,
                }}
            >
                <Tooltip
                    title={networkDisplayName}
                    placement="bottom"
                >
                    <Typography
                        id={`${id}-network-title`}
                        variant="subtitle1"
                        sx={{
                            color: themeVars.palette.text.primary,
                            fontFamily: SHEEN_FONT_DISPLAY,
                            fontSize: "1.15rem",
                            fontWeight: 500,
                            letterSpacing: "0.01em",
                            lineHeight: 1.3,
                            maxWidth: 360,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {networkDisplayName}
                    </Typography>
                </Tooltip>

                <Box
                    aria-hidden={true}
                    sx={{alignSelf: "stretch", backgroundColor: sheen.glassBorder, my: 0.25, width: "1px"}}
                />

                <Box
                    id={`${id}-hud-agent-count`}
                    sx={{
                        alignItems: "center",
                        color: themeVars.palette.text.secondary,
                        display: "flex",
                        fontSize: "0.75rem",
                        fontVariantNumeric: "tabular-nums",
                        gap: 0.5,
                        whiteSpace: "nowrap",
                    }}
                >
                    <HubOutlinedIcon sx={{fontSize: "0.95rem"}} />
                    {agentCount} {agentCount === 1 ? "agent" : "agents"}
                </Box>

                <Box
                    id={`${id}-hud-status`}
                    data-status={hudStatus}
                    sx={{
                        alignItems: "center",
                        backgroundColor: isBusy ? sheen.tint : "transparent",
                        borderRadius: `${PILL_RADIUS}px`,
                        color: isBusy ? themeVars.palette.text.primary : themeVars.palette.text.secondary,
                        display: "flex",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        gap: 0.75,
                        letterSpacing: "0.06em",
                        px: 1,
                        py: 0.35,
                        textTransform: "uppercase",
                        transition: `background-color 0.3s ${SHEEN_EASE}, color 0.3s ${SHEEN_EASE}`,
                        whiteSpace: "nowrap",
                    }}
                >
                    <AnimatePresence
                        initial={false}
                        mode="wait"
                    >
                        {isBusy ? (
                            <motion.span
                                animate={{opacity: 1, scale: 1}}
                                exit={{opacity: 0, scale: 0.6}}
                                initial={{opacity: 0, scale: 0.6}}
                                key="busy"
                                style={{display: "inline-flex"}}
                            >
                                <ThinkingDots id={`${id}-hud-dots`} />
                            </motion.span>
                        ) : (
                            <motion.span
                                animate={{opacity: 1, scale: 1}}
                                exit={{opacity: 0, scale: 0.6}}
                                initial={{opacity: 0, scale: 0.6}}
                                key="idle"
                                style={{
                                    backgroundColor: themeVars.palette.success.main,
                                    borderRadius: "50%",
                                    boxShadow: `0 0 8px ${themeVars.palette.success.main}`,
                                    display: "inline-block",
                                    height: 7,
                                    width: 7,
                                }}
                            />
                        )}
                    </AnimatePresence>
                    {STATUS_LABELS[hudStatus]}
                </Box>
            </Box>
            {children}
        </Box>
    )
}

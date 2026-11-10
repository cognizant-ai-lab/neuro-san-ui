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

import ContactSupportIcon from "@mui/icons-material/ContactSupport"
import Box from "@mui/material/Box"
import {useTheme} from "@mui/material/styles"
import {AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring} from "motion/react"
import {FC, PointerEvent as ReactPointerEvent, useState} from "react"

import {CHATBOT_ENDPOINT} from "../../controller/llm/endpoints"
import {
    getSheen,
    glassSurface,
    glowShadow,
    gradientBorder,
    SHEEN_EASE,
    SHEEN_RADIUS_SURFACE,
    sheenConic,
    sheenGradient,
} from "../../Theme/sheen"
import {useAuthentication} from "../../utils/Authentication"
import {getZIndex} from "../../utils/zIndexLayers"
import {ChatCommon} from "../AgentChat/ChatCommon/ChatCommon"
import {LegacyAgentType} from "../AgentChat/Common/Types"

interface ChatBotProps {
    /**
     * id HTML id to use for the outer component
     */
    readonly id: string

    /**
     * Text about current page to help the LLM respond intelligently
     */
    readonly pageContext: string
}

// How far (px) the launcher orb leans toward the pointer, and the spring that drives it
const MAGNET_PULL = 0.35
const MAGNET_SPRING = {stiffness: 320, damping: 18, mass: 0.5}

// Spring for the chat window growing out of the orb
const WINDOW_SPRING = {type: "spring", stiffness: 340, damping: 30, mass: 0.9} as const

/**
 * Site-wide Chatbot component.
 */
// Temporarily disabled but will be used once we migrated the backend to use Neuro-san RAG.
export const ChatBot: FC<ChatBotProps> = ({id, pageContext}) => {
    const [chatOpen, setChatOpen] = useState<boolean>(false)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState<boolean>(false)
    const {
        user: {name: currentUser},
    } = useAuthentication().data

    // MUI theme
    const theme = useTheme()
    const reduceMotion = useReducedMotion()

    // Magnetic launcher: the orb is pulled toward the pointer while hovered and springs back on leave
    const magnetX = useSpring(useMotionValue(0), MAGNET_SPRING)
    const magnetY = useSpring(useMotionValue(0), MAGNET_SPRING)
    const onOrbPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (reduceMotion) return
        const rect = event.currentTarget.getBoundingClientRect()
        magnetX.set((event.clientX - (rect.left + rect.width / 2)) * MAGNET_PULL)
        magnetY.set((event.clientY - (rect.top + rect.height / 2)) * MAGNET_PULL)
    }
    const onOrbPointerLeave = () => {
        magnetX.set(0)
        magnetY.set(0)
    }

    return (
        <>
            <AnimatePresence>
                {chatOpen && (
                    <motion.div
                        animate={{opacity: 1, scale: 1, x: 0, y: 0, filter: "blur(0px)"}}
                        exit={{
                            opacity: 0,
                            scale: reduceMotion ? 1 : 0.1,
                            x: reduceMotion ? 0 : 12,
                            y: reduceMotion ? 0 : 30,
                            filter: "blur(6px)",
                            transition: {duration: 0.22, ease: "easeIn"},
                        }}
                        id={`chatbot-window-animation-${id}`}
                        initial={
                            reduceMotion ? {opacity: 0} : {opacity: 0, scale: 0.1, x: 12, y: 30, filter: "blur(8px)"}
                        }
                        key="chatbot-window"
                        // Grow out of the launcher orb, which sits at the bottom right
                        style={{
                            bottom: 50,
                            position: "fixed",
                            right: "2rem",
                            height: "60%",
                            // Orb center sits 36px in from the bottom-right corner; the window is inset 2rem / 50px
                            transformOrigin: "calc(100% - 4px) calc(100% + 14px)",
                            zIndex: getZIndex(2, theme),
                        }}
                        transition={reduceMotion ? {duration: 0.2} : WINDOW_SPRING}
                    >
                        <Box
                            id={id}
                            sx={{
                                // Frosted-glass floating panel with an iridescent hairline; colors follow the active
                                // color scheme via palette tokens
                                ...glassSurface(theme, SHEEN_RADIUS_SURFACE),
                                ...gradientBorder(theme, SHEEN_RADIUS_SURFACE, 1, 0.6),
                                height: "100%",
                                maxWidth: 400,
                                boxShadow: [
                                    `inset 0 1px 0 ${getSheen(theme).highlight}`,
                                    `0 30px 80px -24px ${getSheen(theme).glow}`,
                                    "0 24px 60px -20px rgba(0, 0, 0, 0.55)",
                                ].join(", "),
                                overflow: "hidden",
                            }}
                        >
                            <ChatCommon
                                id="chatbot-window"
                                currentUser={currentUser}
                                setIsAwaitingLlm={setIsAwaitingLlm}
                                isAwaitingLlm={isAwaitingLlm}
                                selectedNetwork={LegacyAgentType.ChatBot}
                                legacyAgentEndpoint={CHATBOT_ENDPOINT}
                                extraParams={{pageContext}}
                                // Let the glass panel show through
                                backgroundColor="transparent"
                                title="Cognizant Neuro AI Assistant"
                                onClose={() => setChatOpen(false)}
                            />
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>
            {!chatOpen && (
                <Box
                    component={motion.div}
                    id={`chatbot-icon-${id}`}
                    onPointerLeave={onOrbPointerLeave}
                    onPointerMove={onOrbPointerMove}
                    style={{x: magnetX, y: magnetY}}
                    whileHover={reduceMotion ? undefined : {scale: 1.1}}
                    whileTap={reduceMotion ? undefined : {scale: 0.92}}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        // Glossy gradient orb (specular highlight over the signature gradient) with a spinning,
                        // blurred conic halo around it and an accent glow
                        backgroundImage: [
                            "radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.55), transparent 42%)",
                            sheenGradient(theme),
                        ].join(", "),
                        borderRadius: "50%",
                        bottom: 16,
                        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.45), ${glowShadow(theme)}`,
                        color: "primary.contrastText",
                        cursor: "pointer",
                        height: 40,
                        justifyContent: "center",
                        maxWidth: 40,
                        padding: "1rem",
                        position: "fixed",
                        right: 16,
                        transition: `box-shadow 0.35s ${SHEEN_EASE}`,
                        "&::before": {
                            content: '""',
                            position: "absolute",
                            inset: -5,
                            borderRadius: "50%",
                            background: sheenConic(theme),
                            filter: "blur(4px)",
                            // Only the ring outside the orb, so the halo never washes over its glossy face
                            WebkitMask:
                                "radial-gradient(closest-side, transparent calc(100% - 9px), #000 calc(100% - 6px))",
                            mask: "radial-gradient(closest-side, transparent calc(100% - 9px), #000 calc(100% - 6px))",
                            opacity: 0.85,
                            animation: "sheenSpin 3.5s linear infinite",
                            pointerEvents: "none",
                        },
                        "&:hover": {boxShadow: glowShadow(theme, 48)},
                    }}
                    onClick={() => setChatOpen(true)}
                >
                    <ContactSupportIcon id={`chatbot-icon-${id}`} />
                </Box>
            )}
        </>
    )
}

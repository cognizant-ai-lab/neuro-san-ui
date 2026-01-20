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
import {useColorScheme, useTheme} from "@mui/material"
import Box from "@mui/material/Box"
import Grow from "@mui/material/Grow"
import {FC, useState} from "react"

import {CHATBOT_ENDPOINT} from "../../controller/llm/endpoints"
import {isDarkMode} from "../../Theme/Theme"
import {useAuthentication} from "../../utils/Authentication"
import {getZIndex} from "../../utils/zIndexLayers"
import {ChatCommon} from "../AgentChat/ChatCommon"
import {LegacyAgentType} from "../AgentChat/Types"

interface ChatBotProps {
    /**
     * id HTML id to use for the outer component
     */
    readonly id: string

    /**
     * Path to image for user avatar
     */
    readonly userAvatar: string

    /**
     * Text about current page to help the LLM respond intelligently
     */
    readonly pageContext: string
}

/**
 * Site-wide Chatbot component.
 */
// Temporarily disabled but will be used once we migrated the backend to use Neuro-san RAG.
export const ChatBot: FC<ChatBotProps> = ({id, userAvatar, pageContext}) => {
    const [chatOpen, setChatOpen] = useState<boolean>(false)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState<boolean>(false)
    const {
        user: {name: currentUser},
    } = useAuthentication().data

    // MUI theme and dark mode
    const theme = useTheme()
    const {mode, systemMode} = useColorScheme()
    const darkMode = isDarkMode(mode, systemMode)

    // Shadow color for icon. TODO: use MUI theme system instead.
    const shadowColor = darkMode ? "255, 255, 255" : "0, 0, 0"

    return (
        <>
            <Grow
                id={`chatbot-window-animation-${id}`}
                in={chatOpen}
                timeout={300}
                style={{transformOrigin: "bottom right"}}
                easing="ease-in-out"
            >
                <Box
                    id={id}
                    sx={{
                        position: "fixed",
                        bottom: 50,
                        right: "2rem",
                        height: "60%",
                        maxWidth: 400,
                        background: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-white)",
                        boxShadow: `0 0px 2px 0 rgba(${shadowColor}, 0.15)`,
                        borderRadius: "var(--bs-border-radius)",
                        borderWidth: 1,
                        borderColor: darkMode ? "var(--bs-white)" : "var(--bs-gray-light)",
                        zIndex: getZIndex(2, theme),
                    }}
                >
                    <ChatCommon
                        id="chatbot-window"
                        currentUser={currentUser}
                        setIsAwaitingLlm={setIsAwaitingLlm}
                        isAwaitingLlm={isAwaitingLlm}
                        targetAgent={LegacyAgentType.ChatBot}
                        userImage={userAvatar}
                        legacyAgentEndpoint={CHATBOT_ENDPOINT}
                        extraParams={{pageContext}}
                        backgroundColor={darkMode ? "var(--bs-gray-dark)" : "var(--bs-tertiary-blue)"}
                        title="Cognizant Neuro AI Assistant"
                        onClose={() => setChatOpen(false)}
                    />
                </Box>
            </Grow>
            {!chatOpen && (
                <Box
                    id={`chatbot-icon-${id}`}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-white)",
                        borderRadius: "50%",
                        bottom: 16,
                        // For now mimic MUI's default box shadow but change color based on dark mode.
                        // Eventually we should use MUI's theme system.
                        boxShadow: `
                              0px 2px 4px -1px rgba(${shadowColor}, 0.2),
                              0px 4px 5px 0px rgba(${shadowColor}, 0.14),
                              0px 1px 10px 0px rgba(${shadowColor}, 0.12)
                            `,
                        cursor: "pointer",
                        height: 40,
                        justifyContent: "center",
                        maxWidth: 40,
                        padding: "1rem",
                        position: "fixed",
                        right: 16,
                    }}
                    onClick={() => setChatOpen(true)}
                >
                    <ContactSupportIcon id={`chatbot-icon-${id}`} />
                </Box>
            )}
        </>
    )
}

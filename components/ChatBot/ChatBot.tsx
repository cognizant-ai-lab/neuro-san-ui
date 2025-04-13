import ContactSupportIcon from "@mui/icons-material/ContactSupport"
import Box from "@mui/material/Box"
import Grow from "@mui/material/Grow"
import {FC, useState} from "react"

import {BUILD_TARGET} from "../../const"
import {CHATBOT_ENDPOINT} from "../../controller/llm/endpoints"
import {useAuthentication} from "../../utils/authentication"
import {ZIndexLayers} from "../../utils/zIndexLayers"
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
 * Site-wide chat bot component.
 */
export const ChatBot: FC<ChatBotProps> = ({id, userAvatar, pageContext}) => {
    const [chatOpen, setChatOpen] = useState<boolean>(false)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState<boolean>(false)
    const {
        user: {name: currentUser},
    } = useAuthentication().data

    return (
        BUILD_TARGET === "all" && (
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
                            background: "var(--bs-white)",
                            boxShadow: "0 0px 2px 0 rgba(0, 0, 0, 0.15)",
                            borderRadius: "var(--bs-border-radius)",
                            borderWidth: 1,
                            borderColor: "var(--bs-gray-light)",
                            zIndex: ZIndexLayers.LAYER_2,
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
                            backgroundColor="var(--bs-tertiary-blue)"
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
                            backgroundColor: "var(--bs-white)",
                            borderRadius: "50%",
                            bottom: 16,
                            boxShadow: 4,
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
    )
}

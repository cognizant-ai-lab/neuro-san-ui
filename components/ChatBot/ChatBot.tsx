import ContactSupportIcon from "@mui/icons-material/ContactSupport"
import Box from "@mui/material/Box"
import {FC, useState} from "react"

import {CHATBOT_ENDPOINT} from "../../controller/llm/endpoints"
import {ZIndexLayers} from "../../utils/zIndexLayers"
import {ChatCommon} from "../AgentChat/ChatCommon"
import {LegacyAgentType} from "../AgentChat/Types"

interface ChatBotProps {
    readonly id: string
    readonly userAvatar: string
    readonly pageContext: string
}

export const ChatBot: FC<ChatBotProps> = ({id, userAvatar, pageContext}) => {
    const [chatOpen, setChatOpen] = useState<boolean>(false)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState<boolean>(false)

    return chatOpen ? (
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
                currentUser="test"
                setIsAwaitingLlm={setIsAwaitingLlm}
                isAwaitingLlm={isAwaitingLlm}
                targetAgent={LegacyAgentType.ChatBot}
                userImage={userAvatar}
                legacyAgentEndpoint={CHATBOT_ENDPOINT}
                extraParams={{pageContext}}
                backgroundColor="#e0f7fa"
                title="Cognizant Neuro AI Assistant"
            />
        </Box>
    ) : (
        <Box
            sx={{
                position: "fixed",
                bottom: 16,
                right: 16,
                // display: "flex",
                alignItems: "center",
                justifyContent: "center",
                maxWidth: 40,
                height: 40,
                backgroundColor: "white",
                borderRadius: "50%",
                boxShadow: 3,
                cursor: "pointer",
            }}
        >
            <ContactSupportIcon
                sx={{fontSize: 30}}
                onClick={() => setChatOpen(!chatOpen)}
            />
        </Box>
    )
}

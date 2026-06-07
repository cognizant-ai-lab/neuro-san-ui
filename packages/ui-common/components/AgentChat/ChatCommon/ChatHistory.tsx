import {BaseMessage} from "@langchain/core/messages"
import {useTheme} from "@mui/material/styles"
import {FC} from "react"

import {Conversation} from "./Conversation"
import {ConversationTurn, MessageRole} from "./ConversationTurn"
import {adjustBrightness} from "../../../Theme/Theme"
import {AccordionLite} from "../../Common/AccordionLite"

// #region: Types
interface ChatHistoryProps {
    readonly messages: BaseMessage[]
    readonly id: string
}
// #endregion: Types

/**
 * Helper function to convert from BaseMessage format used in persisted chat history to ConversationTurn format used for
 * rendering the conversation.
 * @param chatHistory
 */
const toTurns = (chatHistory: BaseMessage[]): ConversationTurn[] =>
    chatHistory
        .filter((message) => message.type === "human" || message.type === "ai")
        .map((message) => {
            let role: MessageRole
            if (message.type === "human") {
                role = MessageRole.User
            } else if (message.type === "ai") {
                role = MessageRole.Agent
            }
            return {
                alwaysShow: true,
                id: message.id,
                text: message.content.toString(),
                role,
            }
        })

/**
 * Component for displaying chat history from previous interactions with the agent.
 */
export const ChatHistory: FC<ChatHistoryProps> = ({id, messages}) => {
    const theme = useTheme()

    const turns = toTurns(messages)

    const conversation = (
        <Conversation
            id={`${id}-conversation`}
            key={`${id}-conversation`}
            // Pass "true" here to include final answers, which get persisted as agent
            // messages in chat history.
            includeAgentMessages={true}
            shouldWrapOutput={true}
            turns={turns}
        />
    )

    return (
        <AccordionLite
            id={`${id}-history-items`}
            items={conversation}
            contentSx={{
                // Slightly darker background to differentiate from main chat
                backgroundColor: adjustBrightness(theme.palette.background.paper, -5),
                opacity: 0.5,
            }}
            title="Chat History"
        />
    )
}

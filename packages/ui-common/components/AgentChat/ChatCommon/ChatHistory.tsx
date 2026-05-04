import {BaseMessage} from "@langchain/core/messages"
import {FC} from "react"

import {UserQueryDisplay} from "./UserQueryDisplay"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {hashString} from "../../../utils/text"
import {MUIAccordion} from "../../Common/MUIAccordion"

// #region: Types
interface ChatHistoryProps {
    readonly agentDisplayName: string
    readonly agentImage: string
    readonly chatHistoryKey: string
    readonly currentUser: string
    readonly id: string
    readonly messages: BaseMessage[]
    readonly targetAgent: string
    readonly userImage: string
}
// #endregion: Types

/**
 * Component for displaying chat history from previous interactions with the agent.
 */
export const ChatHistory: FC<ChatHistoryProps> = ({
    agentDisplayName,
    agentImage,
    chatHistoryKey,
    currentUser,
    id,
    messages,
    targetAgent,
    userImage,
}) => (
    <MUIAccordion
        id={id}
        key={chatHistoryKey}
        sx={{marginBottom: "2rem", marginTop: "1rem"}}
        items={[
            {
                title: "Chat History",
                content: messages.map((message) => {
                    const itemKey = hashString(message.text + message.type + message.id)
                    if (message.type.toUpperCase() === ChatMessageType.HUMAN) {
                        return (
                            <UserQueryDisplay
                                key={itemKey}
                                sx={{opacity: 0.5}}
                                title={currentUser}
                                userImage={userImage}
                                userQuery={message.text}
                            />
                        )
                    } else if (message.type.toUpperCase() === ChatMessageType.AI) {
                        return (
                            <UserQueryDisplay
                                key={itemKey}
                                sx={{opacity: 0.5}}
                                title={targetAgent}
                                userImage={agentImage}
                                userQuery={`${agentDisplayName}: ${message.text}`}
                            />
                        )
                    } else {
                        console.warn(`Unrecognized message type in chat history: ${message.type}`)
                        return null
                    }
                }),
            },
        ]}
    />
)

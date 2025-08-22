import {capitalize, startCase} from "lodash"

import {AgentErrorProps} from "./Types"
import {ChatMessage, ChatMessageType, ChatResponse} from "../../generated/neuro-san/NeuroSanClient"

// We ignore any messages that are not of these types
const KNOWN_MESSAGE_TYPES = [ChatMessageType.AI, ChatMessageType.AGENT, ChatMessageType.AGENT_FRAMEWORK]

export const chatMessageFromChunk = (chunk: string): ChatMessage | null => {
    let chatResponse: ChatResponse
    try {
        chatResponse = JSON.parse(chunk)
    } catch {
        return null
    }
    const chatMessage: ChatMessage = chatResponse?.response

    const messageType: ChatMessageType = chatMessage?.type

    // Check if it's a message type we know how to handle
    if (!KNOWN_MESSAGE_TYPES.includes(messageType)) {
        return null
    }

    return chatResponse.response
}

export const checkError: (chatMessageJson: object) => string | null = (chatMessageJson: object) => {
    if (chatMessageJson && "error" in chatMessageJson) {
        const agentError: AgentErrorProps = chatMessageJson as AgentErrorProps
        return (
            `Error occurred. Error: "${agentError.error}", ` +
            `traceback: "${agentError?.traceback}", ` +
            `tool: "${agentError?.tool}"`
        )
    } else {
        return null
    }
}

/**
 * Convert FOO_BAR to more human "Foo Bar"
 * @param agentName Agent name in SNAKE_CASE format.
 * @returns User-friendly agent name.
 */
export function cleanUpAgentName(agentName: string): string {
    return startCase(capitalize(agentName))
}

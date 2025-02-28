import {AgentErrorProps} from "./common"
import {ChatResponse} from "../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../generated/neuro_san/api/grpc/chat"

const knownMessageTypes = [ChatMessageChatMessageType.AI, ChatMessageChatMessageType.LEGACY_LOGS]

export const chatMessageFromChunk = (chunk: string): ChatMessage => {
    let chatResponse: ChatResponse
    try {
        chatResponse = JSON.parse(chunk).result
    } catch (e) {
        console.error(`Error parsing log line: ${e}`)
        return null
    }
    const chatMessage: ChatMessage = chatResponse?.response

    const messageType: ChatMessageChatMessageType = chatMessage?.type

    // Check if it's a message type we know how to handle
    if (!knownMessageTypes.includes(messageType)) {
        return null
    }

    return chatMessage
}
export const tryParseJson: (chunk: string) => null | object | string = (chunk: string) => {
    const chatMessage = chatMessageFromChunk(chunk)
    if (!chatMessage) {
        return null
    }

    let chatMessageJson: object = null
    const chatMessageText = chatMessage.text

    // LLM sometimes wraps the JSON in markdown code blocks, so we need to remove them before parsing
    const chatMessageCleaned = chatMessageText.replace(/```json/gu, "").replace(/```/gu, "")

    try {
        chatMessageJson = JSON.parse(chatMessageCleaned)
        return chatMessageJson
    } catch (error) {
        // Not JSON-like, so just add it to the output
        if (error instanceof SyntaxError) {
            return chatMessageText
        } else {
            // Not an expected error, so rethrow it for someone else to figure out.
            throw error
        }
    }
}

export const checkError = (chatMessageJson: object) => {
    if ("error" in chatMessageJson) {
        const agentError: AgentErrorProps = chatMessageJson as AgentErrorProps
        const errorMessage =
            `Error occurred. Error: "${agentError.error}", ` +
            `traceback: "${agentError?.traceback}", ` +
            `tool: "${agentError?.tool}" Retrying...`
        return {errorMessage}
    } else {
        return null
    }
}

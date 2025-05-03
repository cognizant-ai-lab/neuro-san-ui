/**
 * This file is required for Opportunity Finder > Orchestration.
 * We cannot call the Neuro-san API directly yet, so we need to use the old API.
 * Ideally this file should be removed once we have the new API in place.
 */

import {ChatResponse} from "../../../generated/neuro_san/api/grpc/agent"
import {ChatMessageChatMessageType, ChatMessage as GrpcChatMessage} from "../../../generated/neuro_san/api/grpc/chat"

// We ignore any messages that are not of these types
const KNOWN_MESSAGE_TYPES = [
    ChatMessageChatMessageType.AI,
    ChatMessageChatMessageType.AGENT,
    ChatMessageChatMessageType.AGENT_FRAMEWORK,
]

export const chatMessageFromChunkNeuroSanIndirect = (chunk: string): GrpcChatMessage => {
    let chatResponse: ChatResponse
    try {
        chatResponse = JSON.parse(chunk).result
    } catch {
        return null
    }
    const chatMessage: GrpcChatMessage = chatResponse?.response
    const messageType: ChatMessageChatMessageType = chatMessage?.type

    // Check if it's a message type we know how to handle
    if (!KNOWN_MESSAGE_TYPES.includes(messageType)) {
        return null
    }

    // Have to use fromJSON to convert from "wire format" to "Typescript format", like foo_bar -> fooBar.
    return GrpcChatMessage.fromJSON(chatMessage)
}

/**
 * This function deals with the ambiguity of what we get back from the Neuro-san API.
 * We may receive plain text, or JSON, and the JSON itself may have a text field containing JSON which may or may
 * not be escaped and/or quoted in unpredictable ways by the LLMs. Or it could be a JSON error block.
 * @param chunk The chunk of text to process, as received from Neuro-san
 * @return It's complicated. Either (1) the input chunk, as-is, if we failed to parse it as a ChatMessage,
 * (2) a JSON object if we were able to parse it as such or (3) plain text if all else fails.
 * @throws If we failed to parse JSON but got anything other than a SyntaxError, we rethrow it as-is.
 */
export const tryParseJsonNeuroSanIndirect: (chunk: string) => null | object | string = (chunk: string) => {
    const chatMessage: GrpcChatMessage = chatMessageFromChunkNeuroSanIndirect(chunk)
    if (!chatMessage) {
        return chunk
    }

    let chatMessageJson: object
    const chatMessageText = chatMessage.text

    // LLM sometimes wraps the JSON in markdown code blocks, so we need to remove them before parsing
    const chatMessageCleaned = chatMessageText?.replace(/```json/gu, "").replace(/```/gu, "")

    try {
        chatMessageJson = JSON.parse(chatMessageCleaned)
        return chatMessageJson
    } catch (error) {
        // Not JSON-like, so just return it as is, except we replace escaped newlines with actual newlines
        // Also replace escaped double quotes with single quotes
        if (error instanceof SyntaxError) {
            return chatMessageText.replace(/\\n/gu, "\n").replace(/\\"/gu, "'")
        } else {
            // Not an expected error, so rethrow it for someone else to figure out.
            throw error
        }
    }
}

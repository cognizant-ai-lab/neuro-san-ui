import {capitalize, startCase} from "lodash"

import {AgentErrorProps} from "./AgentError"
import {LOGS_DELIMITER} from "./const"
import {ChatResponse} from "../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../generated/neuro_san/api/grpc/chat"

const knownMessageTypes = [ChatMessageChatMessageType.AI, ChatMessageChatMessageType.LEGACY_LOGS]

export const chatMessageFromChunk = (chunk: string): ChatMessage => {
    let chatResponse: ChatResponse
    try {
        chatResponse = JSON.parse(chunk).result
    } catch (e) {
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

/**
 * This function deals with the ambiguity of what we get back from the Neuro-san API.
 * We may receive plain text, or JSON, and the JSON itself may have a text field containing JSON which may or may
 * not be escaped and/or quoted in unpredictable ways by the LLMs.
 * @param chunk The chunk of text to process, as received from Neuro-san
 * @return It's complicated. Either (1) the input chunk, as-is, if we failed to parse it as a ChatMessage,
 * (2) a JSON object if we were able to parse it as such or (3) plain text if all else fails.
 * @throws If we failed to parse JSON but got anything other than a SyntaxError, we rethrow it as-is.
 */
export const tryParseJson: (chunk: string) => null | object | string = (chunk: string) => {
    const chatMessage = chatMessageFromChunk(chunk)
    if (!chatMessage) {
        return chunk
    }

    let chatMessageJson: object = null
    const chatMessageText = chatMessage.text

    // LLM sometimes wraps the JSON in markdown code blocks, so we need to remove them before parsing
    const chatMessageCleaned = chatMessageText.replace(/```json/gu, "").replace(/```/gu, "")

    try {
        chatMessageJson = JSON.parse(chatMessageCleaned)
        return chatMessageJson
    } catch (error) {
        // Not JSON-like, so just return it as is
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

/**
 * Split a log line into its summary and details parts, using `LOGS_DELIMITER` as the separator. If the delimiter is not
 * found, the entire log line is treated as the details part. This can happen when it's a "follow-on" message from
 * an agent we've already heard from.
 * @param logLine The log line to split
 * @returns An object containing the summary and details parts of the log line
 */
export function splitLogLine(logLine: string) {
    if (logLine.includes(LOGS_DELIMITER)) {
        const logLineElements = logLine.split(LOGS_DELIMITER)

        const logLineSummary = logLineElements[0]
        const summarySentenceCase = logLineSummary.replace(/\w+/gu, capitalize)

        const logLineDetails = logLineElements[1]
        return {summarySentenceCase, logLineDetails}
    } else {
        return {summarySentenceCase: "Agent message", logLineDetails: logLine}
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

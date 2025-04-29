import {capitalize, startCase} from "lodash"

import {AgentErrorProps, ChatMessage, ChatResponse} from "./Types"

export const chatMessageFromChunk = (chunk: string): ChatMessage => {
    let chatResponse: ChatResponse
    try {
        chatResponse = JSON.parse(chunk)
    } catch {
        return null
    }
    const chatMessage: ChatMessage = chatResponse.response

    // TODO: filter out unknown message types like we did with previous API

    // Have to use fromJSON to convert from "wire format" to "Typescript format", like foo_bar -> fooBar.
    return chatMessage
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
export const tryParseJson: (chunk: string) => null | object | string = (chunk: string) => {
    const chatMessage: ChatMessage = chatMessageFromChunk(chunk)
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
            return chatMessageText?.replace(/\\n/gu, "\n").replace(/\\"/gu, "'")
        } else {
            // Not an expected error, so rethrow it for someone else to figure out.
            throw error
        }
    }
}

export const checkError: (chatMessageJson: object) => string | null = (chatMessageJson: object) => {
    if ("error" in chatMessageJson) {
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

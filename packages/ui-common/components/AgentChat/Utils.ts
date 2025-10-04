import capitalize from "lodash-es/capitalize.js"
import startCase from "lodash-es/startCase.js"

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
export const cleanUpAgentName = (agentName: string): string => {
    return startCase(capitalize(agentName))
}

/**
 * Parse text to extract and format "Invoking" messages in a readable way.
 * Converts "Invoking: `Tool` with `{json}`" to "Invoking `Tool` with \"inquiry text\""
 * Filters out mode parameter and removes JSON object syntax.
 * @param text The text to parse
 * @returns Formatted text with inquiry or the original text if no inquiry found
 */
export const parseInquiryFromText = (text: string): string => {
    if (!text) return ""

    // Remove markdown code block if present using safe string operations
    let cleaned = text.trim()
    const jsonBlockStart = cleaned.indexOf("```json")
    const jsonBlockEnd = cleaned.indexOf("```", jsonBlockStart + 7)

    if (jsonBlockStart !== -1 && jsonBlockEnd !== -1) {
        // Extract content between ```json and closing ```
        cleaned = cleaned.substring(jsonBlockStart + 7, jsonBlockEnd).trim()
    }

    // Try to parse "Invoking: `Tool` with `{json}`" format
    try {
        const invokingRegex = /Invoking: `(?<agentName>[^`]+)` with `(?<jsonStr>.+)`/u
        const invokingMatch = invokingRegex.exec(cleaned)
        if (invokingMatch?.groups) {
            const agentName = invokingMatch.groups["agentName"]
            let jsonStr = invokingMatch.groups["jsonStr"]
            jsonStr = jsonStr.replace(/'/gu, '"')

            try {
                const parsed = JSON.parse(jsonStr)
                const inquiry = parsed.inquiry || parsed.Inquiry

                if (inquiry) {
                    // Format as: Invoking `AgentName` with "inquiry text"
                    return `Invoking \`${agentName}\` with "${inquiry}"`
                }
            } catch {
                // If JSON parsing fails, just return the original cleaned text
                return cleaned
            }
        }

        // Try to parse direct JSON format
        const parsed = JSON.parse(cleaned)
        // Both "inquiry" and "Inquiry" keys can be present
        if (parsed.inquiry) return parsed.inquiry
        if (parsed.Inquiry) return parsed.Inquiry

        // If inquiry not found, return cleaned text
        return cleaned
    } catch {
        // If not JSON, try to extract a readable line
        const inquiryRegex = /inquiry\s*[:=]\s*["']?(?<inquiryVal>[^\n"']+)["']?/iu
        const inquiryMatch = inquiryRegex.exec(cleaned)
        if (inquiryMatch?.groups?.["inquiryVal"]) return inquiryMatch.groups["inquiryVal"]

        // Fallback: show first line or up to 120 chars
        return cleaned.split("\n")[0].slice(0, 120)
    }
}

/**
 * Check if text is meaningful enough to display in a thought bubble.
 * Filters out very short strings like "0", "1", etc.
 * @param text The text to check
 * @returns true if text is meaningful, false otherwise
 */
export const isTextMeaningful = (text: string): boolean => {
    if (!text) return false
    const trimmed = text.trim()
    // Filter out single digits, very short strings (< 3 chars)
    if (trimmed.length < 3) return false
    // Filter out strings that are just numbers
    if (/^\d+$/u.test(trimmed)) return false
    return true
}

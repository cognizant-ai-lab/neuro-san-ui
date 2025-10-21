/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import capitalize from "lodash-es/capitalize.js"
import startCase from "lodash-es/startCase.js"

import {AgentErrorProps} from "./Types"
import {ChatMessage, ChatMessageType, ChatResponse} from "../../generated/neuro-san/NeuroSanClient"

// We ignore any messages that are not of these types
const KNOWN_MESSAGE_TYPES = [
    ChatMessageType.AI,
    ChatMessageType.AGENT,
    ChatMessageType.AGENT_FRAMEWORK,
    ChatMessageType.HUMAN,
    ChatMessageType.SYSTEM,
]

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

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

import {isEmpty} from "lodash-es"
import startCase from "lodash-es/startCase.js"

import {AgentErrorProps} from "./Types"
import {ChatMessage, ChatMessageType, ChatResponse} from "../../../generated/neuro-san/NeuroSanClient"

// We ignore any messages that are not of these types
export const KNOWN_MESSAGE_TYPES: ChatMessageType[] = [
    ChatMessageType.AI,
    ChatMessageType.AGENT,
    ChatMessageType.AGENT_FRAMEWORK,
    ChatMessageType.AGENT_PROGRESS,
    ChatMessageType.HUMAN,
    ChatMessageType.SYSTEM,
]

// HUMAN omitted for plasma edges mainly for performance reasons. However, does it make sense for plasma to include
// human messages anyway?
export const KNOWN_MESSAGE_TYPES_FOR_PLASMA: ChatMessageType[] = KNOWN_MESSAGE_TYPES.filter(
    (type) => type !== ChatMessageType.HUMAN
)

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

/**
 * Type guard to check if a value has the shape of an AgentErrorProps, which indicates it's an error message from
 * an agent. Note: not all Neuro-san agents follow this convention.
 * @param value The value to check.
 * @returns True if the value is an AgentErrorProps, false otherwise.
 */
const isAgentErrorLike = (value: unknown): value is AgentErrorProps => {
    return typeof (value as {error?: unknown} | null)?.error === "string"
}

export const checkError = (chatMessageJson: Record<string, unknown>): string | null => {
    if (isEmpty(chatMessageJson) || !isAgentErrorLike(chatMessageJson)) {
        return null
    }

    const {error, traceback, tool} = chatMessageJson
    return `Error occurred. Error: "${error}", traceback: "${traceback}", tool: "${tool}"`
}

export const removeTrailingUuid = (agentName: string): string => {
    return agentName?.replace(
        /[_-][0-9a-fA-F]{8}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{12}$/u,
        ""
    )
}

/**
 * Convert FOO_BAR to more human "Foo Bar".
 * @param agentName Agent name in SNAKE_CASE format.
 * @returns User-friendly agent name.
 */
export const cleanUpAgentName = (agentName: string): string => {
    return startCase(agentName)
}

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

import {v4 as uuid} from "uuid"

import {ChatMessage, ChatMessageType} from "../../generated/neuro-san/NeuroSanClient"

export interface AgentConversation {
    // The specific agents involved in this conversation path
    agents: Set<string>
    // Unique identifier for the conversation
    id: string
    // Timestamp when the conversation started
    startedAt: Date
    // The conversation text to display in thought bubbles
    text?: string
    // The conversation type
    type: ChatMessageType
}

export const isFinalMessage = (chatMessage: {
    structure?: {tool_end?: boolean; total_tokens?: number}
    text?: string
}): boolean => {
    const isAgentFinalResponse = chatMessage.structure?.total_tokens
    const isCodedToolFinalResponse = chatMessage.structure?.tool_end
    return Boolean(isAgentFinalResponse || isCodedToolFinalResponse)
}

export const extractConversation = (chatMessage: ChatMessage): AgentConversation | null => {
    // If there are no origins in a chat message, can't extract a conversation
    if (!chatMessage?.origin?.length) {
        return null
    }

    const agents: string[] = chatMessage.origin.map((originItem) => originItem.tool).filter(Boolean)

    return agents?.length >= 2
        ? {
              // Generate a UUID for the conversation ID
              id: `conv_${uuid()}`,
              agents: new Set(agents),
              startedAt: new Date(),
              text: chatMessage.text,
              type: chatMessage.type,
          }
        : null
}

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

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {
    AgentConversation,
    createConversation,
    extractConversations,
    isFinalMessage,
} from "../../../components/MultiAgentAccelerator/AgentConversations"
import {ChatMessage, ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"

jest.mock("../../../components/Common/notification")

describe("agentConversations", () => {
    withStrictMocks()

    describe("createConversation", () => {
        it("should create a conversation with correct properties", () => {
            const agents = ["agent1", "agent2"]
            const text = "Hello, this is a test conversation."
            const type = ChatMessageType.AGENT

            const conversation: AgentConversation = createConversation(agents, text, type)

            expect(conversation).toHaveProperty("id")
            expect(conversation.agents).toEqual(new Set(agents))
            expect(conversation).toHaveProperty("startedAt")
            expect(conversation.text).toBe(text)
            expect(conversation.type).toBe(type)
        })
    })

    describe("isFinalMessage", () => {
        it("should detect final message with total_tokens", () => {
            const message = {
                structure: {total_tokens: 100},
                text: "",
            }

            expect(isFinalMessage(message)).toBe(true)
        })

        it("should detect final message with tool_end", () => {
            const message = {
                structure: {tool_end: true},
                text: "Got Result:",
            }

            expect(isFinalMessage(message)).toBe(true)
        })

        it("should not detect final message without indicators", () => {
            const message = {
                text: "",
            }

            expect(isFinalMessage(message)).toBe(false)
        })
    })

    describe("extractConversations", () => {
        it("should handle message without origin info", () => {
            const chatMessage: ChatMessage = {
                type: ChatMessageType.AI,
                origin: null,
                text: "Processing...",
            }

            const existingConversations: AgentConversation[] = [
                createConversation(["agent1"], "Existing conversation", ChatMessageType.AGENT),
            ]

            const result = extractConversations(chatMessage, existingConversations)

            // A message without origin should not modify existing conversations
            expect(result).toEqual(existingConversations)
        })

        it("should create new conversation for new agents", () => {
            const mockOrigin = [
                {tool: "agent1", instantiation_index: 0},
                {tool: "agent2", instantiation_index: 1},
            ]

            const chatMessage: ChatMessage = {
                type: ChatMessageType.AI,
                origin: mockOrigin,
                text: "Processing...",
            }

            const result = extractConversations(chatMessage, [])

            expect(result).not.toBeNull()
            expect(result).toHaveLength(1)
            expect(result[0].agents.has("agent1")).toBe(true)
            expect(result[0].agents.has("agent2")).toBe(true)
        })

        it("should remove agents on final message", () => {
            const conversations: AgentConversation[] = []
            const conversation = createConversation(["agent1", "agent2"], "Test message", ChatMessageType.AGENT)
            const conversationsWithAgents = [...conversations, conversation]

            const mockOriginFinal = [{tool: "agent1", instantiation_index: 0}]

            const chatMessage: ChatMessage = {
                type: ChatMessageType.AGENT,
                origin: mockOriginFinal,
                structure: {total_tokens: 100},
                text: "",
            }

            const result = extractConversations(chatMessage, conversationsWithAgents)

            expect(result).not.toBeNull()
            expect(result).toHaveLength(1)
            expect(result[0].agents.has("agent1")).toBe(false)
            expect(result[0].agents.has("agent2")).toBe(true)
        })

        it("should remove empty conversations", () => {
            const conversations: AgentConversation[] = []
            const conversation = createConversation(["agent1"], "Test message", ChatMessageType.AGENT)
            const conversationsWithAgent = [...conversations, conversation]

            const mockOriginFinal = [{tool: "agent1", instantiation_index: 0}]

            const chatMessage = {
                type: ChatMessageType.AGENT,
                origin: mockOriginFinal,
                structure: {total_tokens: 100},
                text: "",
            }

            const result = extractConversations(chatMessage, conversationsWithAgent)

            // Should set to empty when no conversations remain
            expect(result).toEqual([])
        })

        it("should use structure.params.inquiry when present", () => {
            const mockOrigin = [{tool: "agentX", instantiation_index: 0}]

            const inquiry = "Inquiry text here"
            const chatMessage = {
                type: ChatMessageType.AGENT,
                origin: mockOrigin,
                structure: {params: {inquiry}},
                text: "This text should be ignored",
            }

            const result = extractConversations(chatMessage, [])

            expect(result).not.toBeNull()
            expect(result).toHaveLength(1)
            expect(result[0].text).toBe(inquiry)
        })

        it("should fall back to chat message text when no inquiry present", () => {
            const mockOrigin = [{tool: "agentY", instantiation_index: 0}]

            const text = "Chat message text used"
            const chatMessage = {
                type: ChatMessageType.AI,
                origin: mockOrigin,
                structure: {params: {}},
                text,
            }

            const result = extractConversations(chatMessage, [])

            expect(result).not.toBeNull()
            expect(result).toHaveLength(1)
            expect(result[0].text).toBe(text)
        })
    })
})

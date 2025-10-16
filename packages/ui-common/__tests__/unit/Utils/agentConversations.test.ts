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
import {chatMessageFromChunk} from "../../../components/AgentChat/Utils"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {
    AgentConversation,
    createConversation,
    isFinalMessage,
    processChatChunk,
    updateAgentCounts,
} from "../../../utils/agentConversations"

// Mock the chatMessageFromChunk utility
jest.mock("../../../components/AgentChat/Utils", () => ({
    chatMessageFromChunk: jest.fn(),
}))

jest.mock("../../../components/Common/notification")

const mockChatMessageFromChunk = jest.mocked(chatMessageFromChunk)

describe("agentConversations", () => {
    withStrictMocks()

    describe("createConversation", () => {
        it("should create a new conversation with empty agents", () => {
            const conversation = createConversation()

            expect(conversation.id).toMatch(/^conv_\d+[a-z0-9]+$/u)
            expect(conversation.agents).toBeInstanceOf(Set)
            expect(conversation.agents.size).toBe(0)
            expect(conversation.startedAt).toBeInstanceOf(Date)
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

    describe("updateAgentCounts", () => {
        it("should update agent counts correctly", () => {
            const existingCounts = new Map([["agent1", 1]])
            const origins = [
                {tool: "agent1", instantiation_index: 0},
                {tool: "agent2", instantiation_index: 1},
            ]

            const updatedCounts = updateAgentCounts(existingCounts, origins)

            expect(updatedCounts.get("agent1")).toBe(2)
            expect(updatedCounts.get("agent2")).toBe(1)
        })
    })

    describe("processChatChunk", () => {
        it("should handle chunk without origin info", () => {
            mockChatMessageFromChunk.mockReturnValue({
                origin: [],
            })

            const result = processChatChunk("test chat chunk", new Map(), null)

            expect(result.success).toBe(true)
            expect(result.newConversations).toBeNull()
            expect(result.newCounts).toEqual(new Map())
        })

        it("should create new conversation for new agents", () => {
            const mockOrigin = [
                {tool: "agent1", instantiation_index: 0},
                {tool: "agent2", instantiation_index: 1},
            ]

            mockChatMessageFromChunk.mockReturnValue({
                type: ChatMessageType.AI,
                origin: mockOrigin,
                text: "Processing...",
            })

            const result = processChatChunk("test chat chunk", new Map(), [])

            expect(result.success).toBe(true)
            expect(result.newConversations).toHaveLength(1)
            expect(result.newConversations[0].agents.has("agent1")).toBe(true)
            expect(result.newConversations[0].agents.has("agent2")).toBe(true)
        })

        it("should remove agents on final message", () => {
            const conversations: AgentConversation[] = []
            const conversation = createConversation()
            conversation.agents.add("agent1")
            conversation.agents.add("agent2")
            const conversationsWithAgents = [...conversations, conversation]

            const mockOriginFinal = [{tool: "agent1", instantiation_index: 0}]

            mockChatMessageFromChunk.mockReturnValue({
                type: ChatMessageType.AGENT,
                origin: mockOriginFinal,
                structure: {total_tokens: 100},
                text: "",
            })

            const result = processChatChunk("final chat chunk", new Map(), conversationsWithAgents)

            expect(result.success).toBe(true)
            expect(result.newConversations).toHaveLength(1)
            expect(result.newConversations[0].agents.has("agent1")).toBe(false)
            expect(result.newConversations[0].agents.has("agent2")).toBe(true)
        })

        it("should remove empty conversations", () => {
            const conversations: AgentConversation[] = []
            const conversation = createConversation()
            conversation.agents.add("agent1")
            const conversationsWithAgent = [...conversations, conversation]

            const mockOriginFinal = [{tool: "agent1", instantiation_index: 0}]

            mockChatMessageFromChunk.mockReturnValue({
                type: ChatMessageType.AGENT,
                origin: mockOriginFinal,
                structure: {total_tokens: 100},
                text: "",
            })

            const result = processChatChunk("final chat chunk", new Map(), conversationsWithAgent)

            expect(result.success).toBe(true)

            // Should set to null when no conversations remain
            expect(result.newConversations).toBeNull()
        })

        it("should handle errors gracefully", () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)

            mockChatMessageFromChunk.mockImplementation(() => {
                throw new Error("Parsing error")
            })

            const result = processChatChunk("invalid chat chunk", new Map(), null)

            expect(result.success).toBe(false)
            expect(consoleErrorSpy).toHaveBeenCalledWith("Agent conversation error:", expect.any(Error))
        })
    })
})

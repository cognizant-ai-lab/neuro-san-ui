import {chatMessageFromChunk} from "../../../components/AgentChat/Utils"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {
    AgentConversation,
    createConversation,
    isFinalMessage,
    processChatChunk,
    updateAgentCounts,
} from "../../../utils/agentConversations"
import {withStrictMocks} from "../../common/strictMocks"

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
        let agentCounts: Map<string, number>
        let currentConversations: AgentConversation[] | null
        let setAgentCounts: jest.Mock
        let setCurrentConversations: jest.Mock

        beforeEach(() => {
            agentCounts = new Map()
            currentConversations = null
            setAgentCounts = jest.fn()
            setCurrentConversations = jest.fn()
        })

        it("should handle chunk without origin info", () => {
            mockChatMessageFromChunk.mockReturnValue({
                origin: [],
            })

            const result = processChatChunk(
                "test chat chunk",
                agentCounts,
                currentConversations,
                setAgentCounts,
                setCurrentConversations
            )

            expect(result).toBe(true)
            expect(setCurrentConversations).not.toHaveBeenCalled()
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

            processChatChunk("test chat chunk", agentCounts, [], setAgentCounts, setCurrentConversations)

            expect(setAgentCounts).toHaveBeenCalled()
            expect(setCurrentConversations).toHaveBeenCalled()

            const newConversations = setCurrentConversations.mock.calls[0][0]
            expect(newConversations).toHaveLength(1)
            expect(newConversations[0].agents.has("agent1")).toBe(true)
            expect(newConversations[0].agents.has("agent2")).toBe(true)
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

            processChatChunk(
                "final chat chunk",
                agentCounts,
                conversationsWithAgents,
                setAgentCounts,
                setCurrentConversations
            )

            const updatedConversations = setCurrentConversations.mock.calls[0][0]
            expect(updatedConversations).toHaveLength(1)
            expect(updatedConversations[0].agents.has("agent1")).toBe(false)
            expect(updatedConversations[0].agents.has("agent2")).toBe(true)
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

            processChatChunk(
                "final chat chunk",
                agentCounts,
                conversationsWithAgent,
                setAgentCounts,
                setCurrentConversations
            )

            // Should set to null when no conversations remain
            expect(setCurrentConversations).toHaveBeenCalledWith(null)
        })

        it("should handle errors gracefully", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)

            mockChatMessageFromChunk.mockImplementation(() => {
                throw new Error("Parsing error")
            })

            const result = processChatChunk(
                "invalid chat chunk",
                agentCounts,
                currentConversations,
                setAgentCounts,
                setCurrentConversations
            )

            expect(result).toBe(false)
            expect(consoleErrorSpy).toHaveBeenCalledWith("Agent conversation error:", expect.any(Error))
            consoleErrorSpy.mockRestore()
        })
    })
})

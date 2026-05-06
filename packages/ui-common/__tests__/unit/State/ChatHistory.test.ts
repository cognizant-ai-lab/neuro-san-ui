// Include mock for IndexedDB
import "fake-indexeddb/auto"

import {AIMessage, HumanMessage, SystemMessage} from "@langchain/core/messages"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ChatContext} from "../../../generated/neuro-san/NeuroSanClient"
import {MAX_CHAT_HISTORY_ITEMS, useAgentChatHistoryStore} from "../../../state/ChatHistory"
import {indexedDBStorage} from "../../../state/IndexedDBStorage"

const TEST_MESSAGES = [
    new AIMessage("AI message"),
    new HumanMessage("human message"),
    new SystemMessage("system message"),
]

jest.mock("../../../state/IndexedDBStorage", () => ({
    ...jest.requireActual("../../../state/IndexedDBStorage"),
}))

describe("ChatHistory", () => {
    withStrictMocks()
    beforeEach(() => {
        // Clear the chat history before each test
        const allHistory = useAgentChatHistoryStore.getState().history

        Object.keys(allHistory).forEach((agentId) => {
            useAgentChatHistoryStore.getState().resetHistory(agentId)
        })
    })

    it("should save and restore chat history messages", async () => {
        useAgentChatHistoryStore.getState().updateChatHistory("agent1", TEST_MESSAGES)

        const updatedHistory = useAgentChatHistoryStore.getState().history
        expect(updatedHistory["agent1"]?.chatHistory).toEqual(TEST_MESSAGES)
    })

    it("Should limit saved chat history to max items", async () => {
        const messages = Array.from({length: 100}, (_, i) => new HumanMessage(`message ${i}`))

        useAgentChatHistoryStore.getState().updateChatHistory("agent1", messages)

        const updatedHistory = useAgentChatHistoryStore.getState().history
        expect(updatedHistory["agent1"]?.chatHistory.length).toBeLessThanOrEqual(MAX_CHAT_HISTORY_ITEMS)
        expect(updatedHistory["agent1"]?.chatHistory[0].text).toBe(`message ${100 - MAX_CHAT_HISTORY_ITEMS}`)
    })

    it("should handle resetting chat history", async () => {
        const updateChatHistory = useAgentChatHistoryStore.getState().updateChatHistory

        updateChatHistory("agent2", TEST_MESSAGES)

        useAgentChatHistoryStore.getState().resetHistory("agent2")

        const updatedHistory = useAgentChatHistoryStore.getState().history
        expect(updatedHistory["agent2"]?.chatHistory).toBeUndefined()
    })

    it("should handle requests for missing items", async () => {
        const historyItems = useAgentChatHistoryStore.getState().history
        expect(historyItems["nonexistent-agent"]).toBeUndefined()
    })

    it("should save and restore chat context", async () => {
        const chatContext: ChatContext = {
            chat_histories: [
                {
                    origin: [
                        {
                            tool: "tool1",
                            instantiation_index: 1,
                        },
                    ],
                },
            ],
        }
        useAgentChatHistoryStore.getState().updateChatContext("agent3", chatContext)

        const updatedHistory = useAgentChatHistoryStore.getState().history
        expect(updatedHistory["agent3"]?.chatContext).toEqual(chatContext)
    })

    it("should save and restore sly_data", async () => {
        const slyData = {
            key1: "value1",
            key2: 123,
        }
        useAgentChatHistoryStore.getState().updateSlyData("agent4", slyData)

        const updatedHistory = useAgentChatHistoryStore.getState().history
        expect(updatedHistory["agent4"]?.slyData).toEqual(slyData)
    })

    it("should copy history from one agent to another", async () => {
        useAgentChatHistoryStore.getState().updateChatHistory("agentA", TEST_MESSAGES)
        useAgentChatHistoryStore.getState().updateSlyData("agentA", {key: "value"})

        useAgentChatHistoryStore.getState().copyHistory("agentA", "agentB")

        const copiedHistory = useAgentChatHistoryStore.getState().history
        expect(copiedHistory["agentB"]?.chatHistory).toEqual(TEST_MESSAGES)
        expect(copiedHistory["agentB"]?.slyData).toEqual({key: "value"})
        // Original should still be present
        expect(copiedHistory["agentA"]?.chatHistory).toEqual(TEST_MESSAGES)
    })

    it("strips agent_reservations from slyData when copying history", async () => {
        // agent_reservations encodes the old network's reservation ID. If copied and bounced back to the
        // backend on the next chat, the backend echoes the old reservation which then overwrites the new
        // network in the temp-networks store via onChunkReceived.
        useAgentChatHistoryStore.getState().updateSlyData("agentA", {
            agent_reservations: [{reservation_id: "old-res-123", lifetime_in_seconds: 300}],
            chat_context: "some context",
        })

        useAgentChatHistoryStore.getState().copyHistory("agentA", "agentB")

        const copied = useAgentChatHistoryStore.getState().history["agentB"]?.slyData
        expect(copied).not.toHaveProperty("agent_reservations")
        expect(copied).toEqual({chat_context: "some context"})
        // Source should be untouched
        const source = useAgentChatHistoryStore.getState().history["agentA"]?.slyData
        expect(source).toHaveProperty("agent_reservations")
    })

    it("should be a no-op when copying from a non-existent agent", async () => {
        const historyBefore = useAgentChatHistoryStore.getState().history

        useAgentChatHistoryStore.getState().copyHistory("nonexistent", "agentC")

        const historyAfter = useAgentChatHistoryStore.getState().history
        expect(historyAfter).toEqual(historyBefore)
        expect(historyAfter["agentC"]).toBeUndefined()
    })

    it("calls removeItem on clearStorage", () => {
        const removeItemSpy = jest.spyOn(indexedDBStorage, "removeItem").mockResolvedValueOnce()
        useAgentChatHistoryStore.persist.clearStorage()
        expect(removeItemSpy).toHaveBeenCalled()
    })

    it("should call getItem on rehydrate", async () => {
        const getItemSpy = jest.spyOn(indexedDBStorage, "getItem").mockResolvedValueOnce("testItem")
        await useAgentChatHistoryStore.persist.rehydrate()
        expect(getItemSpy).toHaveBeenCalled()

        // Exercise path where item is missing (e.g. first time user).
        getItemSpy.mockClear()
        getItemSpy.mockResolvedValueOnce(null)
        await useAgentChatHistoryStore.persist.rehydrate()
        expect(getItemSpy).toHaveBeenCalled()
    })
})

/**
 * Zustand state store for agent chat conversation history
 *
 */
import {BaseMessage} from "@langchain/core/messages"
import {create} from "zustand"
import {createJSONStorage, persist} from "zustand/middleware"

import {idbStorage} from "./IndexDBStorage"
import {ChatContext} from "../generated/neuro-san/NeuroSanClient"

type SlyData = Record<string, unknown>

/*
Note on ChatContext vs ChatHistory:
    "Legacy" (not Neuro-san) agents use ChatHistory, which is a collection of messages of various types, Human, AI,
    System etc. It mimics the langchain field of the same name.
    Neuro-san agents deal in ChatContext, which is a more complex collection of chat histories, since more agents
are involved.
    Both fields fulfill the same purpose: to maintain conversation state across multiple messages.
*/
export interface AgentChatHistory {
    readonly chatHistory: BaseMessage[]
    readonly chatContext: ChatContext
    readonly slyData: SlyData
}

/**
 * State store interface
 */
interface ChatHistoryStore {
    readonly history: Record<string, AgentChatHistory>
    updateChatContext: (agentId: string, chatContext: ChatContext) => void
    updateChatHistory: (agentId: string, chatHistory: BaseMessage[]) => void
    updateSlyData: (agentId: string, slyData: SlyData) => void
}

/**
 * The hook that lets apps use the store.
 */
export const useAgentChatHistoryStore = create<ChatHistoryStore>()(
    persist(
        (set) => ({
            history: {},
            updateChatContext: (agentId: string, chatContext: ChatContext) =>
                set((state) => {
                    const existing = state.history[agentId]
                    const newHistory = {...state.history, [agentId]: {...existing, chatContext}}
                    return {history: newHistory}
                }),
            updateChatHistory: (agentId: string, chatHistory: BaseMessage[]) =>
                set((state) => {
                    const existing = state.history[agentId]
                    const newHistory = {...state.history, [agentId]: {...existing, chatHistory}}
                    return {history: newHistory}
                }),
            updateSlyData: (agentId: string, slyData: SlyData) =>
                set((state) => {
                    const existing = state.history[agentId]
                    const newHistory = {...state.history, [agentId]: {...existing, slyData}}
                    return {history: newHistory}
                }),
        }),
        {
            name: "agent-chat-history",
            storage: createJSONStorage(() => idbStorage),
        }
    )
)

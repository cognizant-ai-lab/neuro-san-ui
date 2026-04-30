/**
 * Zustand state store for agent chat conversation history
 *
 */
import {
    BaseMessage,
    mapChatMessagesToStoredMessages,
    mapStoredMessagesToChatMessages,
    StoredMessage,
} from "@langchain/core/messages"
import {create} from "zustand"
import {persist, PersistStorage, StorageValue} from "zustand/middleware"

import {indexedDBStorage} from "./IndexedDBStorage"
import {ChatContext} from "../generated/neuro-san/NeuroSanClient"

// Define a type to represent sly_data, which is super loose and can be almost anything depending on the agent.
type SlyData = Record<string, unknown>

// Maximum number of messages to keep in the chat history for each agent. Once we reach this limit, we will start
// dropping old messages.
const MAX_CHAT_HISTORY_ITEMS = 50

/*
Note on ChatContext vs ChatHistory:
    "Legacy" (not Neuro-san) agents use ChatHistory, which is a collection of messages of various types, Human, AI,
    System etc. It mimics the langchain field of the same name.
    Neuro-san agents deal in ChatContext, which is a more complex collection of chat histories, since more agents
are involved.
    Both fields fulfill the same purpose: to maintain conversation state across multiple messages.
*/
interface AgentChatHistory {
    readonly chatHistory: BaseMessage[]
    readonly chatContext: ChatContext
    readonly slyData: SlyData
}

/**
 * State store interface
 */
interface ChatHistoryStore {
    readonly history: Record<string, AgentChatHistory>
    resetHistory: (agentId: string) => void
    updateChatContext: (agentId: string, chatContext: ChatContext) => void
    updateChatHistory: (agentId: string, messages: BaseMessage[]) => void
    updateSlyData: (agentId: string, slyData: SlyData) => void
}

// We need a separate type for how we store the chat history in IndexedDB, to allow for how langchain serializes
// chat messages.
type StoredAgentChatHistory = Omit<AgentChatHistory, "chatHistory"> & {readonly chatHistory: StoredMessage[]}

interface StoredChatHistoryStore {
    readonly history: Record<string, StoredAgentChatHistory>
}

/**
 * Custom storage implementation for persisting the chat history in IndexedDB. We need to do some custom
 * serialization and deserialization here because the chat history contains complex objects
 * (langchain BaseMessage and ChatContext) that can't be directly serialized to JSON. We use the langchain API
 * to help with the serialization and deserialization.
 */
const chatHistoryStorage: PersistStorage<ChatHistoryStore> = {
    getItem: async (itemName: string): Promise<StorageValue<ChatHistoryStore> | null> => {
        const stored = await indexedDBStorage.getItem(itemName)
        if (!stored) return null
        const parsed = stored as StorageValue<StoredChatHistoryStore>
        const rehydratedHistory = Object.fromEntries(
            Object.entries(parsed?.state?.history ?? {}).map(([agentId, entry]) => [
                agentId,
                {
                    ...entry,
                    chatHistory: entry.chatHistory ? mapStoredMessagesToChatMessages(entry.chatHistory) : [],
                },
            ])
        )
        return {...parsed, state: {...parsed.state, history: rehydratedHistory}} as StorageValue<ChatHistoryStore>
    },
    setItem: async (itemName: string, value: StorageValue<ChatHistoryStore>): Promise<void> => {
        const serializedHistory = Object.fromEntries(
            Object.entries(value?.state?.history ?? {}).map(([agentId, entry]) => [
                agentId,
                {
                    ...entry,
                    chatHistory: entry.chatHistory ? mapChatMessagesToStoredMessages(entry.chatHistory) : [],
                },
            ])
        )
        const toStore = {state: {history: serializedHistory}, version: value.version}
        await indexedDBStorage.setItem(itemName, toStore)
    },
    removeItem: async (itemName: string): Promise<void> => {
        await indexedDBStorage.removeItem(itemName)
    },
}

// Key to use for storing the chat history in IndexedDB
const STORE_KEY = "agent-chat-history"

/**
 * The hook that lets apps use the store.
 * Structure:
 * <pre>
 * IndexedDB database: "zustand-store"
 *   └── object store: "kv"
 *         └── key: "agent-chat-history"
 *                 └── value: serialized Map<string, AgentChatHistory>
 *                       └── key: agentId (string)
 *                       └── value: {chatHistory, chatContext, slyData}
 * </pre>
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
            updateChatHistory: (agentId: string, messages: BaseMessage[]) =>
                set((state) => {
                    const existing = state.history[agentId]
                    const updated = [...(existing?.chatHistory ?? []), ...messages]
                    const truncated =
                        updated.length > MAX_CHAT_HISTORY_ITEMS ? updated.slice(-MAX_CHAT_HISTORY_ITEMS) : updated
                    return {history: {...state.history, [agentId]: {...existing, chatHistory: truncated}}}
                }),
            updateSlyData: (agentId: string, slyData: SlyData) =>
                set((state) => {
                    const existing = state.history[agentId]
                    const mergedSlyData = {...existing?.slyData, ...slyData} // merge here, with fresh state
                    const newHistory = {...state.history, [agentId]: {...existing, slyData: mergedSlyData}}
                    return {history: newHistory}
                }),
            resetHistory: (agentId: string) =>
                set((state) => {
                    const {[agentId]: _, ...rest} = state.history
                    return {history: rest}
                }),
        }),
        {
            name: STORE_KEY,
            storage: chatHistoryStorage,
        }
    )
)

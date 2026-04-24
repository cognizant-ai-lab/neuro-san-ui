import {AGENT_NETWORK_DEFINITION_KEY, AGENT_PROGRESS_CONNECTIVITY_KEY} from "./const"
import {ChatMessage, ChatMessageType, ConnectivityInfo} from "../../generated/neuro-san/NeuroSanClient"

// #region: Types

/**
 * A single agent entry within an agent network definition, as received in sly_data from the backend.
 */
export interface AgentNetworkDefinitionEntry {
    readonly origin: string
    readonly tools?: string[]
    readonly display_as?: string
    readonly instructions?: string
}

// #endregion: Types

// #region: LocalStorage helpers

/**
 * Reads the persisted agent network definition from localStorage.
 * Returns an empty array if nothing is stored or parsing fails.
 */
export const readAgentNetworkDefinition = (): AgentNetworkDefinitionEntry[] => {
    try {
        const raw = localStorage.getItem(AGENT_NETWORK_DEFINITION_KEY)
        return raw ? (JSON.parse(raw) as AgentNetworkDefinitionEntry[]) : []
    } catch {
        return []
    }
}

/**
 * Writes the agent network definition to localStorage.
 */
export const writeAgentNetworkDefinition = (definition: AgentNetworkDefinitionEntry[]): void => {
    try {
        localStorage.setItem(AGENT_NETWORK_DEFINITION_KEY, JSON.stringify(definition))
    } catch {
        // localStorage may be unavailable in some environments (SSR, private browsing, etc.)
    }
}

// #endregion: LocalStorage helpers

/**
 * Extracts network progress information from a chat message, if present. Only messages of type AGENT_PROGRESS
 * can have this information. When present, it should be under the key defined by AGENT_PROGRESS_CONNECTIVITY_KEY
 * in the message structure.
 * @param message The chat message to extract network progress from
 * @returns An array of ConnectivityInfo objects if the message contains network progress information, or an empty
 * array if not
 */
export const extractAgentNetworkDesignerProgress = (message: ChatMessage): ConnectivityInfo[] => {
    const agentProgress = message?.structure?.[AGENT_PROGRESS_CONNECTIVITY_KEY] as ConnectivityInfo[]
    if (message?.type === ChatMessageType.AGENT_PROGRESS && agentProgress) {
        return agentProgress
    } else {
        // Not the type of message that would contain network progress information, or the key is not present
        return []
    }
}

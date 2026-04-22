import {AGENT_PROGRESS_CONNECTIVITY_KEY} from "./const"
import {ChatMessage, ChatMessageType, ConnectivityInfo} from "../../generated/neuro-san/NeuroSanClient"

/**
 * Extracts network progress information from a chat message, if present. Only messages of type AGENT_PROGRESS
 * can have this information. When present, it should be under the key defined by AGENT_PROGRESS_CONNECTIVITY_KEY
 * in the message structure.
 * @param message The chat message to extract network progress from
 * @returns An array of ConnectivityInfo objects if the message contains network progress information, or an empty
 * array if not
 */
export const extractAgentNetworkDesignerProgress = (message: ChatMessage): ConnectivityInfo[] | null => {
    if (message?.type === ChatMessageType.AGENT_PROGRESS && message?.structure?.[AGENT_PROGRESS_CONNECTIVITY_KEY]) {
        return message?.structure?.[AGENT_PROGRESS_CONNECTIVITY_KEY] as ConnectivityInfo[]
    } else {
        // Not the type of message that would contain reservations, or no reservations found, return empty array
        return []
    }
}

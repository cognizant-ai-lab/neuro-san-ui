import {ChatMessage, ChatMessageType, ConnectivityInfo} from "../../generated/neuro-san/NeuroSanClient"

export const extractNetworkProgress = (message: ChatMessage): ConnectivityInfo[] | null => {
    if (message?.type === ChatMessageType.AGENT_PROGRESS && message?.structure?.["connectivity_info"]) {
        return message?.structure?.["connectivity_info"] as ConnectivityInfo[]
    } else {
        // Not the type of message that would contain reservations, or no reservations found, return empty array
        return []
    }
}

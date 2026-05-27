import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"

export enum MessageRole {
    "AgentHeader" = "AgentHeader",
    "Agent" = "Agent",
    "Error" = "Error",
    "FinalAnswer" = "FinalAnswer",
    "LegacyAgent" = "LegacyAgent",
    "User" = "User",
    "Warning" = "Warning",
}

export interface ConversationTurn {
    readonly agentName?: string
    readonly agentDisplayName?: string
    readonly alwaysShow?: boolean
    readonly id: string
    readonly messageType?: ChatMessageType
    readonly role: MessageRole
    readonly text: string
}

import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"

export enum MessageRole {
    "Agent" = "Agent",
    "Error" = "Error",
    "FinalAnswer" = "FinalAnswer",
    "LegacyAgent" = "LegacyAgent",
    "User" = "User",
    "Warning" = "Warning",
}

export interface ConversationTurn {
    readonly agentDisplayName?: string
    readonly agentName?: string
    readonly id: string
    readonly messageType?: ChatMessageType
    readonly role: MessageRole
    readonly structure?: Record<string, unknown>
    readonly text: string
}

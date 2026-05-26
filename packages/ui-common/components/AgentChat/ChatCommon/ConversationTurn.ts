import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"

export enum MessageRole {
    "Agent" = "Agent",
    "Error" = "Error",
    "FinalAnswer" = "FinalAnswer",
    "Info" = "Info",
    "LegacyAgent" = "LegacyAgent",
    "User" = "User",
    "Warning" = "Warning",
}

export interface ConversationTurn {
    readonly agentName?: string
    readonly alwaysShow?: boolean
    readonly id: string
    readonly messageType?: ChatMessageType
    readonly role: MessageRole
    readonly text: string
}

import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"

/**
 * The various messages roles in a conversation turn.
 */
export enum MessageRole {
    "Agent" = "Agent",
    "Error" = "Error",
    "FinalAnswer" = "FinalAnswer",
    "User" = "User",
    "Warning" = "Warning",
}

/**
 * Represents a single turn in a conversation, which may include a message from the user or agent, or an error
 */
export interface ConversationTurn {
    readonly agentDisplayName?: string
    readonly agentName?: string
    readonly id: string
    readonly messageType?: ChatMessageType
    readonly role: MessageRole
    readonly structure?: Record<string, unknown>
    readonly text?: string
}

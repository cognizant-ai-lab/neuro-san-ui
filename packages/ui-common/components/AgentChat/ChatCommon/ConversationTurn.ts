import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"

export type MessageRole = "user" | "agent" | "finalAnswer" | "error" | "warning" | "info"

export interface ConversationTurn {
    readonly agentName?: string
    readonly alwaysShow?: boolean
    readonly id: string
    readonly messageType?: ChatMessageType
    readonly role: MessageRole
    readonly text: string
}

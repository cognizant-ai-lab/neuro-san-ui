import {ChatMessage, ChatMessageType} from "../../generated/neuro-san/NeuroSanClient"
import {NotificationType, sendNotification} from "../Common/notification"

/**
 * Definition of a temporary network. No schema for this provided by backend so we second-guess it here.
 * @see https://github.com/cognizant-ai-lab/neuro-san/issues/743
 * @example
 * ```json
 * {
 *   "reservation_id": "copy_cat-hello_world-14ecb260-4389-44f3-afad-ea315dfa1966",
 *   "lifetime_in_seconds": 300.0,
 *   "expiration_time_in_seconds": 1771438301.0245166
 * }
 * ```
 */
export type AgentReservation = {
    readonly reservation_id: string
    readonly lifetime_in_seconds: number
    readonly expiration_time_in_seconds: number
}

// We expect the agent reservations to be stored in sly_data under this key
const AGENT_RESERVATIONS_KEY = "agent_reservations"

export const extractReservations = (message: ChatMessage): AgentReservation[] => {
    try {
        // Check for temp networks ("reservations") in sly_data

        if (
            message?.type === ChatMessageType.AGENT_FRAMEWORK &&
            message?.sly_data && // check for agent_reservations key in slyData
            AGENT_RESERVATIONS_KEY in message.sly_data
        ) {
            return message.sly_data[AGENT_RESERVATIONS_KEY] as AgentReservation[]
        } else {
            // Not the type of message that would contain reservations, or no reservations found, return empty array
            return []
        }
    } catch (error) {
        sendNotification(NotificationType.error, "Agent conversation error")
        console.error("Agent conversation error:", error)
        return null
    }
}

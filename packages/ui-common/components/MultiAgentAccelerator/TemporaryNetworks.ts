import {ChatMessage, ChatMessageType} from "../../generated/neuro-san/NeuroSanClient"

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

// We expect the agent network definition to be stored in sly_data under this key, if it is provided by the backend
const AGENT_NETWORK_DEFINITION = "agent_network_definition"

/**
 * Extracts agent reservations from a chat message, if they exist.
 * @param message The chat message to extract reservations from. We expect reservations to be present in messages of
 * type AGENT_FRAMEWORK only.
 * @return An array of AgentReservation objects if reservations are found, or an empty array if not found or
 * if the message is not of the expected type.
 */
export const extractReservations = (message: ChatMessage): AgentReservation[] => {
    // Check for temp networks ("reservations") in sly_data
    if (message?.type === ChatMessageType.AGENT_FRAMEWORK && message?.sly_data?.[AGENT_RESERVATIONS_KEY]) {
        return message.sly_data[AGENT_RESERVATIONS_KEY] as AgentReservation[]
    } else {
        // Not the type of message that would contain reservations, or no reservations found, return empty array
        return []
    }
}

/**
 * Extracts the agent network definition from a chat message, if it exists.
 * @param message The chat message to extract network definition from.
 * We expect the network definition to be present in messages of type AGENT_FRAMEWORK only.
 * @return The network definition object, or null if not found or not the right type of message.
 */
export const extractNetworkDefinition = (message: ChatMessage): object => {
    // Check for agent network definitions in sly_data
    if (message?.type === ChatMessageType.AGENT_FRAMEWORK && message?.sly_data?.[AGENT_NETWORK_DEFINITION]) {
        return message.sly_data[AGENT_NETWORK_DEFINITION] as object
    } else {
        // Not the type of message that would contain reservations, or no reservations found, return empty array
        return null
    }
}

import {
    AGENT_NETWORK_HOCON,
    AGENT_RESERVATIONS_KEY,
    AgentNetworkDefinitionEntry,
    TEMPORARY_NETWORK_FOLDER,
} from "./const"
import {ChatMessage, ChatMessageType} from "../../generated/neuro-san/NeuroSanClient"
import {TemporaryNetwork} from "../../state/TemporaryNetworks"

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
 * Extracts the agent network HOCON from a chat message, if it exists.
 * @param message The chat message to extract network HOCON from.
 * We expect the network definition to be present in messages of type AGENT_FRAMEWORK only.
 * @return The network HOCON as a string, or null if not found or not the right type of message.
 */
export const extractNetworkHocon = (message: ChatMessage): string | null => {
    // Check for agent network HOCON in sly_data
    if (message?.type === ChatMessageType.AGENT_FRAMEWORK && message?.sly_data?.[AGENT_NETWORK_HOCON]) {
        return message.sly_data[AGENT_NETWORK_HOCON] as string
    } else {
        // Not the type of message that would contain a network HOCON, or no network HOCON found, return null
        return null
    }
}

// UUID v4 pattern: 8-4-4-4-12 hex chars separated by dashes
const UUID_SUFFIX_RE = /-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iu

/**
 * Derives the canonical network name from a reservation ID.
 *
 * The backend encodes the network name as a prefix in the reservation ID, followed by a UUID suffix:
 * `{network_name}-{uuid}`, e.g. `travel_agency_ops-7876642e-fe75-4d44-a61e-300688a1a6c5`.
 *
 * Stripping the UUID suffix gives the stable name that can be used for deduplication across reservations.
 * Returns `undefined` when the reservation ID doesn't match the expected format.
 */
export const extractNetworkNameFromReservationId = (reservationId: string): string | undefined => {
    const stripped = reservationId.replace(UUID_SUFFIX_RE, "")
    // If nothing was stripped the format was unexpected — return undefined so callers don't misidentify.
    return stripped !== reservationId ? stripped : undefined
}

/**
 * Converts a list of agent reservations received from the backend into TemporaryNetwork objects that can be
 * displayed in the UI.
 * @param agentReservations List of "agent reservations" (temporary networks) received from the backend
 * @param networkHocon Optional network HOCON string associated with the reservations.
 * @param agentNetworkDefinition Optional agent network definition entries.
 * @param agentNetworkName Optional backend canonical network name used to match / deduplicate networks.
 *   When omitted, the name is derived from the reservation_id via {@link extractNetworkNameFromReservationId}.
 * @returns List of TemporaryNetwork objects ready for the store.
 */
export const convertReservationsToNetworks = (
    agentReservations: AgentReservation[],
    networkHocon: string | null,
    agentNetworkDefinition?: AgentNetworkDefinitionEntry[],
    agentNetworkName?: string
): TemporaryNetwork[] => {
    return agentReservations.map((reservation) => ({
        reservation,
        agentInfo: {
            agent_name: `${TEMPORARY_NETWORK_FOLDER}/${reservation.reservation_id}`,
        },
        // Use the explicit name when provided; fall back to extracting it from the reservation_id so that
        // networks are always deduplicated by name even when the backend omits AGENT_NETWORK_NAME_KEY.
        agentNetworkName: agentNetworkName ?? extractNetworkNameFromReservationId(reservation.reservation_id),
        networkHocon,
        agentNetworkDefinition,
    }))
}

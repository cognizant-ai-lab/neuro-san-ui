import {
    AGENT_NETWORK_DEFINITION_KEY,
    AGENT_NETWORK_HOCON,
    AGENT_NETWORK_NAME_KEY,
    AGENT_RESERVATIONS_KEY,
    AgentNetworkDefinitionEntry,
    DisplayAs,
    TEMPORARY_NETWORK_FOLDER,
} from "./const"
import {ChatMessage, ChatMessageType} from "../../generated/neuro-san/NeuroSanClient"
import {extractNetworkNameFromReservationId, TemporaryNetwork} from "../../state/TemporaryNetworks"

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
const extractReservations = (message: ChatMessage): AgentReservation[] => {
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
const extractNetworkHocon = (message: ChatMessage): string | null => {
    // Check for agent network HOCON in sly_data
    if (message?.type === ChatMessageType.AGENT_FRAMEWORK && message?.sly_data?.[AGENT_NETWORK_HOCON]) {
        return message.sly_data[AGENT_NETWORK_HOCON] as string
    } else {
        // Not the type of message that would contain a network HOCON, or no network HOCON found, return null
        return null
    }
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

export {extractNetworkNameFromReservationId} from "../../state/TemporaryNetworks"

/**
 * Merges incoming networks into target, keeping the entry with the highest expiration time.
 * Returns a new array; does not mutate either argument.
 */
export const mergeNetworks = (target: TemporaryNetwork[], incoming: TemporaryNetwork[]): TemporaryNetwork[] => {
    const result = [...target]
    for (const n of incoming) {
        const key = n.agentNetworkName ?? n.reservation.reservation_id
        const existingIdx = result.findIndex((e) => (e.agentNetworkName ?? e.reservation.reservation_id) === key)
        if (existingIdx < 0) {
            result.push(n)
        } else if (
            n.reservation.expiration_time_in_seconds > result[existingIdx].reservation.expiration_time_in_seconds
        ) {
            result[existingIdx] = n
        }
    }
    return result
}

/**
 * Returns true when agentName refers to a known temporary network.
 */
export const isTemporaryNetwork = (agentName: string | null, networks: TemporaryNetwork[]): boolean =>
    agentName !== null && networks.some((n) => n.agentInfo.agent_name === agentName)

/**
 * Extracts TemporaryNetwork objects from a chat message by reading reservations, HOCON,
 * agent network definition, and agent network name from the message / sly_data.
 * @param message The chat message to extract from.
 * @param agentNetworkDefinitionOverride Optional definition override (e.g. a locally-edited version) that
 *   takes precedence over whatever the backend echoes in sly_data.
 * @param agentNetworkNameOverride Optional name override that takes precedence over sly_data, ensuring the
 *   locally-known name is used for upsert deduplication even when the backend omits AGENT_NETWORK_NAME_KEY.
 * @returns A (possibly empty) array of TemporaryNetwork objects ready for the store.
 */
export const extractTemporaryNetworksFromMessage = (
    message: ChatMessage,
    agentNetworkDefinitionOverride?: AgentNetworkDefinitionEntry[],
    agentNetworkNameOverride?: string
): TemporaryNetwork[] => {
    const reservations = extractReservations(message)
    if (reservations.length === 0) return []

    const networkHocon = extractNetworkHocon(message)
    const agentNetworkDefinition =
        agentNetworkDefinitionOverride ??
        (message.sly_data?.[AGENT_NETWORK_DEFINITION_KEY] as AgentNetworkDefinitionEntry[] | undefined)
    const agentNetworkName =
        agentNetworkNameOverride ?? (message.sly_data?.[AGENT_NETWORK_NAME_KEY] as string | undefined)

    return convertReservationsToNetworks(reservations, networkHocon, agentNetworkDefinition, agentNetworkName)
}

/**
 * Returns true when an agent node supports the edit popup (instructions + description).
 * Only `llm_agent` nodes are editable; `coded_tool`, `langchain_tool`, `external_agent`,
 * and nodes without an explicit `display_as` are read-only.
 */
export const isEditableAgent = (displayAs: string | undefined): boolean => displayAs === DisplayAs.LLM_AGENT

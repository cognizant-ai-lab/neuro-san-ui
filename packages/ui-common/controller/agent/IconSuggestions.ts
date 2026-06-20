import {AgentInfo, ConnectivityResponse} from "../../generated/neuro-san/NeuroSanClient"
import {useIconSuggestionsStore} from "../../state/IconSuggestions"
import {AgentIconSuggestions} from "../Types/AgentIconSuggestions"
import {NetworkIconSuggestions} from "../Types/NetworkIconSuggestions"

/**
 * Utility function to send POST requests with JSON body and handle errors.
 * Used for getting LLM suggestions for icons and branding colors.
 * @template T The expected response type from the server.
 * @param endpoint The API endpoint to send the request to.
 * @param body The request body to send, which will be stringified to JSON.
 * @returns The response from the server parsed as JSON.
 * @throws An error if the request fails or the response is not ok.
 */
export const postJsonRequest = async <T>(endpoint: string, body: Record<string, unknown>): Promise<T> => {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    })

    const jsonResponse = await response.json()
    if (!response.ok || jsonResponse?.error) {
        throw new Error(jsonResponse?.error || response?.statusText)
    }

    return jsonResponse
}

// The two types of suggestions we can get from the LLM
type Suggestions = AgentIconSuggestions | NetworkIconSuggestions

/**
 * Utility function to get icon suggestions from the cache or fetch from the server if not available in the cache.
 *
 * @param keys - The list of keys (agent names or network names) to get suggestions for.
 * @param storeKey - The key in the cache (zustand store) to save the suggestions under.
 * @param fetchSuggestions - Fetch function to query the LLM for suggestions
 * @returns A promise that resolves to a record mapping the keys to suggested MUI icon names.
 */
const getSuggestions = async (
    keys: readonly string[],
    storeKey: "networkIconSuggestions" | "agentIconSuggestions",
    fetchSuggestions: () => Promise<Suggestions>
): Promise<Suggestions> => {
    // Check the cache for suggestions for all the keys.
    // If any key is missing, we will fetch suggestions for all keys to keep it simple.
    const cache = useIconSuggestionsStore.getState()[storeKey]

    // Get the cached suggestions for the keys that are available in the cache
    const cachedSuggestions = keys.reduce<Suggestions>((acc, key) => {
        const cached = cache[key]
        if (cached) {
            acc[key] = cached
        }
        return acc
    }, {})

    // If we have cached suggestions for all keys, return them
    if (Object.keys(cachedSuggestions).length === keys.length) {
        return cachedSuggestions
    }

    // Cache miss. Request suggestions from LLM
    const fetched = await fetchSuggestions()

    // Write-through cache.
    const state = useIconSuggestionsStore.getState()

    if (storeKey === "agentIconSuggestions") {
        state.setAgentIconSuggestions(fetched)
    } else {
        state.setNetworkIconSuggestions(fetched)
    }

    return fetched
}

/**
 * Get LLM suggestions for network icons.
 *
 * @note Will use cached suggestions if available to avoid unnecessary LLM calls
 *
 * @param networks The list of networks to get icon suggestions for.
 * @returns A promise that resolves to a record mapping network names to suggested MUI icon names.
 */
export const getNetworkIconSuggestions = async (networks: readonly AgentInfo[]): Promise<NetworkIconSuggestions> =>
    getSuggestions(
        networks.map((network) => network.agent_name),
        "networkIconSuggestions",
        () => postJsonRequest<NetworkIconSuggestions>("/api/networkIconSuggestions", {networks})
    )
/**
 * Get LLM suggestions for agent icons based on their descriptions from Neuro-san.
 *
 * @note The entire connectivity information and metadata are sent as input to the LLM to help the LLM come up with
 * better suggestions.
 *
 * @note Will use cached suggestions if available to avoid unnecessary LLM calls
 *
 * @param connectivity The connectivity information for the agents in the network, including their descriptions,
 * tools, and connections.
 * @return A promise that resolves to a record mapping agent names to suggested MUI icon names.
 */
export const getAgentIconSuggestions = async (connectivity: ConnectivityResponse): Promise<AgentIconSuggestions> =>
    getSuggestions(
        connectivity.connectivity_info.map((agent) => agent.origin),
        "agentIconSuggestions",
        () =>
            postJsonRequest<AgentIconSuggestions>("/api/agentIconSuggestions", {
                connectivity_info: connectivity.connectivity_info,
                metadata: connectivity.metadata,
            })
    )

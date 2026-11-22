import {environ} from "@cognizant-ai-lab/neuro-san"

import AGENT_ICON_SUGGESTER_NETWORK from "./networks/agent_icon_suggester.json"
import {createAgentNetworkSession} from "./NetworkSuggestions"
import {
    AgentInfo,
    // eslint-disable-next-line camelcase
    ChatFilterChat_filter_type,
    ChatMessageType,
    ChatRequest,
    ChatResponse,
    ConnectivityResponse,
} from "../../generated/neuro-san/NeuroSanClient"
import {useIconSuggestionsStore} from "../../state/IconSuggestions"
import {getApiKey, useSettingsStore} from "../../state/Settings"
import {AgentIconSuggestions} from "../Types/AgentIconSuggestions"
import {NetworkIconSuggestions} from "../Types/NetworkIconSuggestions"
import {postJsonRequest} from "./common/JsonRequest"

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
        console.debug(`Using cached ${storeKey} for keys: ${keys.join(", ")}`)
        return cachedSuggestions
    }

    console.debug(`Cache miss for ${storeKey}. Fetching suggestions for keys: ${keys.join(", ")}`)

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

// Name the agent icon suggester network runs under in the in-browser neuro-san package
const AGENT_ICON_SUGGESTER_NAME = "agent_icon_suggester"

/**
 * Asks the agent icon suggester network, run in the browser by the neuro-san package, for agent icon suggestions.
 *
 * @param connectivity The connectivity information for the agents in the network.
 * @param openAiApiKey The user's own OpenAI API key, which the agent network uses for its LLM calls.
 * @returns A promise that resolves to a record mapping agent names to suggested MUI icon names.
 * @throws An error if the agent network gives no answer or its answer is not JSON.
 */
const getFromLocalNeuroSAN = async (
    connectivity: ConnectivityResponse,
    openAiApiKey: string
): Promise<AgentIconSuggestions> => {
    environ["OPENAI_API_KEY"] = openAiApiKey
    console.debug(
        `Asking ${AGENT_ICON_SUGGESTER_NAME} for icon suggestions for ` +
            `${connectivity.connectivity_info.length} agents`
    )

    const session = createAgentNetworkSession(AGENT_ICON_SUGGESTER_NETWORK, AGENT_ICON_SUGGESTER_NAME)
    const request: ChatRequest = {
        user_message: {
            type: ChatMessageType.HUMAN,
            text: JSON.stringify({
                connectivity_info: connectivity.connectivity_info,
                metadata: connectivity.metadata,
            }),
        },
        // MINIMAL leaves out the agents' internal messages, so the last text is the final answer.
        // eslint-disable-next-line camelcase
        chat_filter: {chat_filter_type: ChatFilterChat_filter_type.MINIMAL},
    }

    let answer = ""
    for await (const chunk of session.streaming_chat(request) as AsyncGenerator<ChatResponse>) {
        answer = chunk.response?.text || answer
    }

    if (!answer) {
        throw new Error(`${AGENT_ICON_SUGGESTER_NAME} returned no answer`)
    }
    return JSON.parse(answer) as AgentIconSuggestions
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
export const getAgentIconSuggestions = async (connectivity: ConnectivityResponse): Promise<AgentIconSuggestions> => {
    const openAiApiKey = getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")
    console.debug(
        `Getting agent icon suggestions for ${connectivity.connectivity_info.length} agents using OpenAI API key: ${
            openAiApiKey ? "present" : "not present"
        }`
    )

    return getSuggestions(
        connectivity.connectivity_info.map((agent) => agent.origin),
        "agentIconSuggestions",
        () =>
            openAiApiKey
                ? getFromLocalNeuroSAN(connectivity, openAiApiKey)
                : postJsonRequest<AgentIconSuggestions>("/api/agentIconSuggestions", {
                      connectivity_info: connectivity.connectivity_info,
                      metadata: connectivity.metadata,
                  })
    )
}

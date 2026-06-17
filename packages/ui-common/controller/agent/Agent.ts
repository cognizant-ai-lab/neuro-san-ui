/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Controller module for interacting with the Agent LLM API.
 */

import {postJsonRequest} from "./IconSuggestions"
import {
    AGENT_NETWORK_DEFINITION_KEY,
    AGENT_NETWORK_DESIGNER_ID,
    AGENT_NETWORK_NAME_KEY,
    AgentNetworkDefinitionEntry,
    TEMPORARY_NETWORK_FOLDER,
} from "../../components/MultiAgentAccelerator/const"
import {
    AgentInfo,
    ApiPaths,
    ChatContext,
    // eslint-disable-next-line camelcase
    ChatFilterChat_filter_type,
    ChatMessage,
    ChatMessageType,
    ChatRequest,
    ChatResponse,
    ConciergeResponse,
    ConnectivityResponse,
    FunctionResponse,
} from "../../generated/neuro-san/NeuroSanClient"
import {sendLlmRequest, StreamingUnit} from "../llm/LlmChat"
import {BrandingSuggestions} from "../Types/Branding"

/**
 * Insert the target agent name into the path. The paths Api enum contains values like:
 * <code>"/api/v1/{agent_name}/connectivity"</code> so unfortunately we need to do a `replace()` to insert the target
 * agent.
 * @param agent The agent to send the request to.
 * @param path The API path to insert the target agent into.
 * @returns The path with the target agent name inserted.
 */
const insertTargetAgent = (agent: string, path: string) => {
    let agentTmp = agent
    // Remove "temporary" prefix from network name if it exists since the server doesn't know about that convention
    if (agentTmp.startsWith(`${TEMPORARY_NETWORK_FOLDER}/`)) {
        agentTmp = agentTmp.replace(`${TEMPORARY_NETWORK_FOLDER}/`, "")
    }

    return path.replace("{agent_name}", agentTmp)
}

export interface TestConnectionResult {
    readonly success: boolean
    readonly status?: string
    readonly version?: string
}

/**
 * Test connection for a neuro-san server.
 * @param url The neuro-san server URL.
 * @returns A boolean indicating whether the connection was successful.
 */
export const testConnection = async (url: string): Promise<TestConnectionResult> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500) // 2.5s timeout

    try {
        const response = await fetch(url, {signal: controller.signal})
        if (!response.ok) {
            return {success: false, status: response.statusText}
        }
        const jsonResponse = await response.json()
        // eslint-disable-next-line no-shadow
        const status = jsonResponse?.status

        // Different versions of the server return different status values, so we need to check for both.
        const success = status === "healthy" || status === "ok"

        // For now, just capture the Neuro-san version since that's all the server returns. More can be added later.
        const version = jsonResponse?.versions?.["neuro-san"]
        return {success, status, version}
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {success: false, status: errorMessage}
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Get LLM suggestions for branding colors based on the company name. This is used to customize the UI colors
 * to match the user's company branding.
 * @param company The name of the company to get branding color suggestions for.
 * @returns A promise that resolves to a record mapping color types (e.g. "primary", "secondary") to hex color codes.
 */
export const getBrandingSuggestions = async (company: string): Promise<BrandingSuggestions> =>
    postJsonRequest<BrandingSuggestions>("/api/branding", {company})

/**
 * Get the list of available agent networks from the concierge service.
 * @param url The neuro-san server URL
 * @returns A promise that resolves to an array of AgentInfo objects.
 */
export const getAgentNetworks = async (url: string): Promise<readonly AgentInfo[]> => {
    const path = `${url}${ApiPaths.ConciergeService_List}`
    const response = await fetch(path)
    const conciergeResponse: ConciergeResponse = (await response.json()) as ConciergeResponse
    return conciergeResponse.agents
}

// Function to split each chunk by newline and call the real callback. The server can send multiple JSON objects per
// chunk delimited by newline.
const handleJsonLines = (chunk: string, callback: (line: string) => void) => {
    chunk.split("\n").forEach((line) => {
        const trimmed = line.trim()
        if (trimmed) {
            callback(trimmed)
        }
    })
}

/**
 * Send a chat query to the Agent LLM API. This opens a session with the agent network.
 * @param url The neuro-san server URL
 * @param signal The AbortSignal to use for the request. Used to cancel the request on user demand
 * @param userInput The user input to send to the agent.
 * @param targetAgent The target agent to send the request to. See CombinedAgentType for some available agents, or
 * could be a string with an arbitrary agent name.
 * @param callback The callback function to be called when a chunk of data is received from the server.
 * @param chatContext "Opaque" conversation context for maintaining conversation state with the server. Neuro-san
 * agents do not use ChatHistory directly, but rather, ChatContext, which is a collection of ChatHistory objects.
 * @param slyData Data items that should not be sent to the LLM. Generated by the server.
 * @param userId Current user ID in the session.
 * @param streamingUnit Determines whether to send data to the callback as soon as it's received (Chunk)
 * or to accumulate it until a newline is received (Line).
 * @returns The response from the agent network.
 */
export const sendChatQuery = async (
    url: string,
    signal: AbortSignal,
    userInput: string,
    targetAgent: string,
    callback: (chunk: string) => void,
    chatContext: ChatContext,
    slyData: Record<string, unknown>,
    userId: string,
    streamingUnit: StreamingUnit = StreamingUnit.Chunk
): Promise<ChatResponse> => {
    // Create request
    const userMessage: ChatMessage = {
        type: ChatMessageType.HUMAN,
        text: userInput,
    }

    const agentChatRequest: ChatRequest = {
        sly_data: slyData,
        user_message: userMessage,
        // eslint-disable-next-line camelcase
        chat_filter: {chat_filter_type: ChatFilterChat_filter_type.MAXIMAL},
        chat_context: chatContext,
    }

    const fetchUrl = `${url}${insertTargetAgent(targetAgent, ApiPaths.AgentService_StreamingChat)}`
    const requestRecord: Record<string, unknown> = Object.entries(agentChatRequest).reduce(
        (acc, [key, value]) => (value ? {...acc, [key]: value} : acc),
        {}
    )

    return sendLlmRequest(
        (chunk: string) => handleJsonLines(chunk, callback),
        signal,
        fetchUrl,
        requestRecord,
        null,
        null,
        userId,
        streamingUnit
    )
}

/**
 * Gets information on the agent and tool connections within a network
 * @param url The neuro-san server URL
 * @param network The network to get connectivity information for
 * @param userId Current user ID in the session.
 * @returns The connectivity info as a <code>ConnectivityResponse</code> object
 * @throws Various exceptions if anything goes wrong such as network issues or invalid agent type.
 * Caller is responsible for try-catch.
 */
export const getConnectivity = async (url: string, network: string, userId: string): Promise<ConnectivityResponse> => {
    const fetchUrl = `${url}${insertTargetAgent(network, ApiPaths.AgentService_Connectivity)}`

    const response = await fetch(fetchUrl, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            user_id: userId,
        },
    })

    if (!response.ok) {
        console.error(`response: ${JSON.stringify(response)}`)
        throw new Error(`Failed to send connectivity request: ${response.statusText}`)
    }

    return response.json()
}

/**
 * Get the function of a specified agent meaning its brief description
 * @param url The neuro-san server URL
 * @param agent The agent to get the function for
 * @param userId Current user ID in the session.
 * @returns The function info as a <code>FunctionResponse</code> object
 * @throws Various exceptions if anything goes wrong such as network issues or invalid agent type.
 */
export const getAgentFunction = async (url: string, agent: string, userId: string): Promise<FunctionResponse> => {
    const fetchUrl = `${url}${insertTargetAgent(agent, ApiPaths.AgentService_Function)}`

    const response = await fetch(fetchUrl, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            user_id: userId,
        },
    })

    if (!response.ok) {
        throw new Error(`Failed to send agent function request: ${response.statusText}`)
    }

    return response.json()
}

/**
 * Streams the Agent Network Designer endpoint with an updated agent definition.
 * Calls `onChunk` for each line received; callers are responsible for parsing
 * reservations / networks out of each chunk.
 */
export const sendNetworkDesignerUpdate = async (
    url: string,
    signal: AbortSignal,
    agentName: string,
    updated: AgentNetworkDefinitionEntry[],
    agentNetworkName: string | undefined,
    currentUser: string,
    onChunk: (chunk: string) => void
): Promise<void> => {
    await sendChatQuery(
        url,
        signal,
        // Shouldn't have to pass a user message, but API behaves differently without it
        `Update instructions for agent "${agentName}"`,
        AGENT_NETWORK_DESIGNER_ID,
        onChunk,
        null,
        {
            [AGENT_NETWORK_DEFINITION_KEY]: updated,
            // Use the backend's canonical name, not the local UUID-based key.
            ...(agentNetworkName ? {[AGENT_NETWORK_NAME_KEY]: agentNetworkName} : {}),
            // skip_designer prevents the backend from using a reasoning model for edits
            skip_designer: true,
        },
        currentUser,
        StreamingUnit.Line
    )
}

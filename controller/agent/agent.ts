/**
 * Controller module for interacting with the Agent LLM API.
 */

import {AgentChatRequest, AgentConnectivityRequest, AgentFunctionRequest, AgentType} from "../../generated/metadata"
import {
    ChatRequest,
    ChatResponse,
    ConnectivityResponse,
    FunctionResponse,
} from "../../generated/neuro_san/api/grpc/agent"
import {ChatContext, ChatMessage, ChatMessageChatMessageType} from "../../generated/neuro_san/api/grpc/chat"
import useEnvironmentStore from "../../state/environment"
import {sendLlmRequest} from "../llm/llm_chat"

// API path for the agent chat endpoint
const CHAT_PATH = "api/v1/agent/streaming_chat"

// API path for the agent connectivity endpoint
const CONNECTIVITY_PATH = "api/v1/agent/connectivity"

// API path for the agent function endpoint
const AGENT_FUNCTION_PATH = "api/v1/agent/function"

/**
 * Send a chat query to the Agent LLM API. This opens a session with the agent network.
 * @param signal The AbortSignal to use for the request. Used to cancel the request on user demand
 * @param userInput The user input to send to the agent.
 * In practice this "input" will actually be the output from one of the previous agents such as the data generator
 * or scoping agent.
 * @param requestUser The user making the request
 * @param targetAgent The target agent to send the request to. See CombinedAgentType for the list of available agents.
 * @param callback The callback function to be called when a chunk of data is received from the server.
 * @param chatContext "Opaque" conversation context for maintaining conversation state with the server. Neuro-san
 * agents do not use ChatHistory directly, but rather, ChatContext, which is a collection of ChatHistory objects.
 * @returns The response from the agent network.
 */
export async function sendChatQuery(
    signal: AbortSignal,
    userInput: string,
    requestUser: string,
    targetAgent: AgentType,
    callback: (chunk: string) => void,
    chatContext: ChatContext
): Promise<ChatResponse> {
    const baseUrl = useEnvironmentStore.getState().backendApiUrl
    const fetchUrl = `${baseUrl}/${CHAT_PATH}`

    // Create request
    const userMessage: ChatMessage = ChatMessage.fromPartial({
        type: ChatMessageChatMessageType.HUMAN,
        text: userInput,
    })

    const agentChatRequest: AgentChatRequest = {
        user: {login: requestUser},
        request: ChatRequest.fromPartial({userMessage, chatContext}),
        targetAgent: targetAgent as AgentType,
    }

    // Convert to JSON (wire) format
    const requestJSON = AgentChatRequest.toJSON(agentChatRequest)

    // Convert to k-v pairs as required by sendLlmRequest
    const requestRecord: Record<string, unknown> = Object.entries(requestJSON).reduce(
        (acc, [key, value]) => (value ? {...acc, [key]: value} : acc),
        {}
    )

    return sendLlmRequest(callback, signal, fetchUrl, requestRecord, null)
}

/**
 * Gets information on what a specified agent is connected to (other agents and tools)
 * @param requestUser The user making the request
 * @param targetAgent The agent to get connectivity information for
 * @returns The connectivity info as a <code>ConnectivityResponse</code> object
 * @throws Various exceptions if anything goes wrong such as network issues or invalid agent type.
 * Caller is responsible for try-catch.
 */
export async function getConnectivity(requestUser: string, targetAgent: AgentType): Promise<ConnectivityResponse> {
    const baseUrl = useEnvironmentStore.getState().backendApiUrl
    const fetchUrl = `${baseUrl}/${CONNECTIVITY_PATH}`

    const connectivityRequest: AgentConnectivityRequest = {
        targetAgent: targetAgent,
        user: {login: requestUser},
        request: undefined,
    }

    // Convert to JSON (wire) format
    const requestJSON = AgentConnectivityRequest.toJSON(connectivityRequest)

    const response = await fetch(fetchUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestJSON),
    })

    if (!response.ok) {
        console.debug(`response: ${JSON.stringify(response)}`)
        throw new Error(`Failed to send connectivity request: ${response.statusText}`)
    }

    const result = await response.json()
    return ConnectivityResponse.fromJSON(result)
}

/**
 * Get the function of a specified agent meaning its brief description
 * @param requestUser The user making the request
 * @param targetAgent The agent to get the function for
 * @returns The function info as a <code>FunctionResponse</code> object
 * @throws Various exceptions if anything goes wrong such as network issues or invalid agent type.
 */
export async function getAgentFunction(requestUser: string, targetAgent: AgentType): Promise<FunctionResponse> {
    const baseUrl = useEnvironmentStore.getState().backendApiUrl
    const fetchUrl = `${baseUrl}/${AGENT_FUNCTION_PATH}`

    const request: AgentFunctionRequest = {
        targetAgent: targetAgent,
        user: {login: requestUser},
        request: undefined,
    }

    // Convert to JSON (wire) format
    const requestJSON = AgentFunctionRequest.toJSON(request)

    const response = await fetch(fetchUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestJSON),
    })

    if (!response.ok) {
        throw new Error(`Failed to send agent function request: ${response.statusText}`)
    }

    const result = await response.json()
    return FunctionResponse.fromJSON(result)
}

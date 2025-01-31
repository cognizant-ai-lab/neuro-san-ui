/**
 * Controller module for interacting with the Agent LLM API.
 */

import {AgentChatRequest, AgentType} from "../../generated/metadata"
import {ChatRequest, ChatResponse} from "../../generated/neuro_san/api/grpc/agent"
import useEnvironmentStore from "../../state/environment"
import {sendLlmRequest} from "../llm/llm_chat"

// API path for the agent chat endpoint
const CHAT_PATH = "api/v1/agent/streaming_chat"

// API path for the agent logs endpoint
/**
 * Send a chat query to the Agent LLM API. This opens a session with the agent network.
 * @param signal The AbortSignal to use for the request. Used to cancel the request on user demand
 * @param userInput The user input to send to the agent.
 * In practice this "input" will actually be the output from one of the previous agents such as the data generator
 * or scoping agent.
 * @param requestUser The user making the request
 * @param callback The callback function to be called when a chunk of data is received from the server.
 * @returns The response from the agent network.
 */
export async function sendChatQuery(
    signal: AbortSignal,
    userInput: string,
    requestUser: string,
    callback: (chunk: string) => void
): Promise<ChatResponse> {
    const baseUrl = useEnvironmentStore.getState().backendApiUrl
    const fetchUrl = `${baseUrl}/${CHAT_PATH}`

    // Create request
    const agentChatRequest: AgentChatRequest = {
        user: {login: requestUser},
        request: ChatRequest.fromPartial({userInput: userInput}),
        targetAgent: AgentType.OPPORTUNITY_FINDER_PIPELINE,
    }

    // Convert to JSON (wire) format
    const requestJSON = AgentChatRequest.toJSON(agentChatRequest)

    // Convert to k-v pairs as required by sendLlmRequest
    const requestRecord = Object.entries(requestJSON).reduce(
        (acc, [key, value]) => (value ? {...acc, [key]: value} : acc),
        {}
    )

    const result = await sendLlmRequest(callback, signal, fetchUrl, requestRecord, null)
    return ChatResponse.fromPartial(result || {})
}

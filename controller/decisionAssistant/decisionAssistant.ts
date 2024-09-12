/**
 * Controller module for interacting with the Decision Assistant LLM API.
 */

import {ChatRequest} from "../../generated/agent"
import {AgentChatRequest, AgentType} from "../../generated/metadata"
import useEnvironmentStore from "../../state/environment"
import {sendLlmRequest} from "../llm/llm_chat"

const DECISION_ASSISTANT_CHAT_PATH = "api/v1/agent/chat"

/**
 * Access the API for DMS chat. Client is responsible for catching and handling exceptions that may be thrown.
 *
 * @param callback The callback function to be called when a chunk of data is received from the server.
 * @param signal The AbortSignal object to be used for aborting the request.
 * @param userInput The user input to send to the server.
 * @param requestUser
 */
export async function sendDecisionAssistantQuery(
    callback: (arg: string) => void,
    signal: AbortSignal,
    userInput: string,
    requestUser: string
) {
    const baseUrl = useEnvironmentStore.getState().backendApiUrl
    const fetchUrl = `${baseUrl}/${DECISION_ASSISTANT_CHAT_PATH}`
    console.debug("user: ", requestUser)
    const agentChatRequest: AgentChatRequest = {
        user: {login: requestUser},
        request: ChatRequest.fromPartial({userInput: userInput}),
        targetAgent: AgentType.OPPORTUNITY_FINDER_PIPELINE,
    }

    const requestJSON = AgentChatRequest.toJSON(agentChatRequest)

    const requestRecord = Object.entries(requestJSON).reduce(
        (acc, [key, value]) => (value ? {...acc, [key]: value} : acc),
        {}
    )

    await sendLlmRequest(callback, signal, fetchUrl, requestRecord, null)
}

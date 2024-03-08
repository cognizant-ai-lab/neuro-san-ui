/**
 * Controller module for interacting with the DMS CHAT LLM API.
 */
import {ChatMessage} from "@langchain/core/messages"

import {sendLlmRequest} from "../llm/llm_chat"
import {Run} from "../run/types"

/**
 * Access the API for DMS chat. Client is responsible for catching and handling exceptions that may be thrown.
 *
 * @param userQuery The user's query.
 * @param context The context part of the CAO.
 * @param prescriptorUrl The URL of the prescriptor for inference.
 * @param predictorUrls The URLs of the predictors for inference.
 * @param callback The callback function to be called when a chunk of data is received from the server.
 * @param signal The AbortSignal object to be used for aborting the request.
 * @param run The current Run for the DMS page
 * @param chatHistory The chat history to be sent to the server. Contains user requests and server responses.
 * @param projectName The name of the project the user is working on.
 * @param projectDescription The description of the project the user is working on.
 */
export async function sendDmsChatQuery(
    userQuery: string,
    context: object,
    prescriptorUrl: string,
    predictorUrls: string[],
    callback: (string) => void,
    signal: AbortSignal,
    run: Run,
    chatHistory?: ChatMessage[],
    projectName?: string,
    projectDescription?: string
) {
    await sendLlmRequest(
        callback,
        signal,
        "/api/gpt/dmschat",
        {
            prescriptorUrl,
            predictorUrls,
            context,
            run,
            projectName,
            projectDescription,
        },
        userQuery,
        chatHistory
    )
}

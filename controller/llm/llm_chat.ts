/**
 * Generic controller class for allowing the user to chat with LLMs.
 * Allows streaming callback for a more interactive experience.
 */

import {BaseMessage} from "@langchain/core/messages"

import {MessageWithKargs} from "../../pages/api/gpt/shared/types"

/**
 * Send a request to an LLM and stream the response to a callback.
 * @param callback The callback function to be called when a chunk of data is received from the server.
 * @param signal The AbortSignal object to be used for aborting the request.
 * @param fetchUrl The URL to send the request to.
 * @param params Arbitrary parameters to send to the server.
 * @param userQuery The user query to send to the server (sometimes part of chat history instead).
 * @param chatHistory The chat history to be sent to the server. Contains user requests and server responses.
 * @returns Nothing, but tokens are streamed to the callback as they are received from the server.
 */
export async function sendLlmRequest(
    callback: (token: string) => void,
    signal: AbortSignal,
    fetchUrl: string,
    params: Record<string, unknown>,
    userQuery?: string,
    chatHistory?: (BaseMessage | MessageWithKargs)[]
) {
    const res = await fetch(fetchUrl, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            ...(chatHistory && {chatHistory: chatHistory}), // Only include chat history if it exists (optional)
            ...(userQuery && {userQuery: userQuery}), // Only include user query if it exists (optional)
            ...params,
        }),
        signal: signal,
    })

    // Check if the request was successful
    if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText} error code ${res.status}`)
    }

    if (callback) {
        const reader = res.body.getReader()
        const utf8decoder = new TextDecoder("utf8")

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const {done, value} = await reader.read()

            if (done) {
                break // End of stream
            }

            // Decode chunk from server
            const chunk = utf8decoder.decode(value)

            // Send current chunk to callback
            callback(chunk)
        }

        return null
    } else {
        return res.text()
    }
}

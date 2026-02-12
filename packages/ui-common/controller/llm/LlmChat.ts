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
 * Generic controller class for allowing the user to chat with LLMs.
 * Allows streaming callback for a more interactive experience.
 */

import {BaseMessage} from "@langchain/core/messages"

/**
 * Send a request to an LLM and stream the response to a callback.
 * @param callback The callback function to be called when a chunk of data is received from the server.
 * @param signal The AbortSignal object to be used for aborting the request.
 * @param fetchUrl The URL to send the request to.
 * @param params Arbitrary parameters to send to the server.
 * @param userQuery The user query to send to the server (sometimes part of chat history instead).
 * @param chatHistory The chat history to be sent to the server. Contains user requests and server responses.
 * @param userId Current user ID in the session.
 * @returns Either the JSON result of the call, or, if a callback is provided, nothing, but tokens are streamed
 * to the callback as they are received from the server.
 */
export const sendLlmRequest = async (
    callback: (token: string) => void,
    signal: AbortSignal,
    fetchUrl: string,
    params: Record<string, unknown>,
    userQuery?: string,
    chatHistory?: BaseMessage[],
    userId?: string
) => {
    const res = await fetch(fetchUrl, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(userId && {user_id: userId}), // Only include user query if it exists (optional)
        },
        body: JSON.stringify({
            ...(chatHistory && {chatHistory}), // Only include chat history if it exists (optional)
            ...(userQuery && {userQuery}), // Only include user query if it exists (optional)
            ...params,
        }),
        signal,
    })

    // Check if the request was successful
    if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText} error code ${res.status}`)
    }

    if (callback) {
        const reader = res.body.getReader()
        const utf8decoder = new TextDecoder("utf8")

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
        return res.json()
    }
}

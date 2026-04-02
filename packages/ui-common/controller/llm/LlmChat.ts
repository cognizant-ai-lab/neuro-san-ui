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
 * Determines whether to send data to the callback as soon as it's received (Chunk) or to accumulate it
 * until a newline is received (Line).
 */
export enum StreamingUnit {
    Chunk,
    Line,
}

const handleStreamingCallback = async (
    res: Response,
    callback: (token: string) => void,
    streamingUnit: StreamingUnit
) => {
    const reader = res.body.getReader()
    const utf8decoder = new TextDecoder("utf8")

    let buffer = ""
    while (true) {
        const {done, value} = await reader.read()

        // If the caller wants to process chunk by chunk, send it to the callback immediately.
        if (streamingUnit === StreamingUnit.Chunk) {
            if (done) {
                break // End of stream
            }

            // Decode chunk from server and send to callback
            const chunk = utf8decoder.decode(value)
            callback(chunk)
        } else {
            // Otherwise, accumulate in buffer until we have a full line (delimited by newline character)
            // to send to the callback.
            if (done) {
                // Handle any remaining data in buffer (last line without newline)
                if (buffer.trim().length > 0) {
                    callback(buffer)
                }
                break // End of stream
            }

            // Decode chunk from server. Note: pass stream: true to handle multibyte characters that may be split
            // across chunks
            const chunk = utf8decoder.decode(value, {stream: true})

            // Append chunk to buffer
            buffer += chunk

            // Process all complete lines in the buffer
            let newlineIndex
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
                // Extract the complete line (without the newline)
                const line = buffer.substring(0, newlineIndex).trim()

                // Keep the rest for next iteration
                buffer = buffer.substring(newlineIndex + 1)

                // Skip empty lines
                if (line.length > 0) {
                    // Send the current line
                    callback(line)
                }
            }
        }
    }
}

const FAKE_IT = false
// const FAKE_RESPONSE_FILE = "/santa.json"
const FAKE_RESPONSE_FILE = "/mnp.json"

/**
 * Send a request to an LLM and stream the response to a callback.
 * @param callback The callback function to be called when a chunk of data is received from the server.
 * @param signal The AbortSignal object to be used for aborting the request.
 * @param fetchUrl The URL to send the request to.
 * @param params Arbitrary parameters to send to the server.
 * @param userQuery The user query to send to the server (sometimes part of chat history instead).
 * @param chatHistory The chat history to be sent to the server. Contains user requests and server responses.
 * @param userId Current user ID in the session.
 * @param streamingUnit Determines whether to send data to the callback as soon as it's received (Chunk)
 * or to accumulate it until a newline is received (Line). Default is Chunk.
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
    userId?: string,
    streamingUnit: StreamingUnit = StreamingUnit.Chunk
) => {
    console.debug(`Sending LLM request to ${fetchUrl} with StreamingUnit ${StreamingUnit[streamingUnit]}`)
    let res
    if (!FAKE_IT) {
        res = await fetch(fetchUrl, {
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
    } else {
        res = await fetch(FAKE_RESPONSE_FILE)
    }

    // Check if the request was successful
    if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText} error code ${res.status}`)
    }

    if (callback) {
        // If a callback was provided, we assume the response is a stream and handle it accordingly
        await handleStreamingCallback(res, callback, streamingUnit)

        return null
    } else {
        return res.json()
    }
}

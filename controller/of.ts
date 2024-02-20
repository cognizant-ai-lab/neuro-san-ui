import {ChatMessage} from "langchain/schema"

export async function sendOpportunityFinderRequest(
    userQuery: string,
    callback: (string) => void,
    signal: AbortSignal,
    chatHistory?: ChatMessage[],
) {
    const res = await fetch("/api/gpt/of", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            chatHistory: chatHistory,
            userQuery: userQuery,
        }),
        signal: signal,
    })

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
}
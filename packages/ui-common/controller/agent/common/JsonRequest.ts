/**
 * Utility function to send POST requests with JSON body and handle errors.
 * Used for getting LLM suggestions for icons and branding colors.
 * @template T The expected response type from the server.
 * @param endpoint The API endpoint to send the request to.
 * @param body The request body to send, which will be stringified to JSON.
 * @returns The response from the server parsed as JSON.
 * @throws An error if the request fails or the response is not ok.
 */
export const postJsonRequest = async <T>(endpoint: string, body: Record<string, unknown>): Promise<T> => {
    console.debug(`Sending POST request to ${endpoint} with body:`, body)
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    })

    const jsonResponse = await response.json()
    if (!response.ok || jsonResponse?.error) {
        throw new Error(jsonResponse?.error || response?.statusText)
    }

    return jsonResponse
}

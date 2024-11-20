/**
 * Access the API for DMS chat. Client is responsible for catching and handling exceptions that may be thrown.
 *
 * @param userQuery The user's query.
 */
export async function sendDalleQuery(userQuery: string) {
    const res = await fetch("/api/gpt/code-ui", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({userQuery: userQuery.replaceAll("\n", "")}),
    })

    // Check if the request was successful
    if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText} error code ${res.status}`)
    }

    return res.json()
}

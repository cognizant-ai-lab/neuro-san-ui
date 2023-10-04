/**
 * Controller module for interacting with the DMS CHAT LLM API.
 */

/**
 * Access the API for DMS chat.
 *
 */
export async function sendDmsChatQuery(userQuery: string, context: object, prescriptorUrl: string,
                                       predictorUrls: string[]) {
    return await fetch("/api/gpt/dmschat", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userQuery: userQuery,
            context: context,
            prescriptorUrl: prescriptorUrl,
            predictorUrls: predictorUrls
        })
    })
}

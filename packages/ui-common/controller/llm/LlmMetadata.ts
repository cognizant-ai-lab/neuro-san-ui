export const isOpenAIKeyValid = async (key: string) => {
    try {
        // Just call the "list models" API with the supplied key.
        // We don't care about the result, just whether it succeeds or not
        const res = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${key}`,
            },
        })

        return res.ok
    } catch (e) {
        console.error("Error validating API key:", e)
        return false
    }
}

export const isAnthropicKeyValid = async (key: string) => {
    try {
        // Just call the "list models" API with the supplied key.
        // We don't care about the result, just whether it succeeds or not
        const res = await fetch("https://api.anthropic.com/v1/models", {
            method: "GET",
            headers: {
                Accept: "application/json",
                "anthropic-version": "2023-06-01",
                "X-Api-Key": key,
                // Request vendor to allow CORS for this endpoint
                // Reference: https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/
                // The request will be rejected without this.
                "anthropic-dangerous-direct-browser-access": "true",
            },
        })

        return res.ok
    } catch (e) {
        console.error("Error validating API key:", e)
        return false
    }
}

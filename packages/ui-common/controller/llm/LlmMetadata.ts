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
            },
        })

        return res.ok
    } catch (e) {
        console.error("Error validating API key:", e)
        return false
    }
}

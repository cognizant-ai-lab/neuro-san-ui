//#region: Types and Interfaces

export interface KeyValidationResult {
    ok: boolean
    status?: number
    message?: string
}

/**
 * Build a failure result from a non-OK response, parsing the error shapes used by both OpenAI
 * ({@code {error: {message, type}}}) and Anthropic ({@code {type, error: {type, message}, request_id}}).
 * @param res The failed response.
 * @return A {@link KeyValidationResult} describing the failure.
 */
interface ProviderErrorBody {
    type?: string
    error?: {type?: string; message?: string}
}

//#endregion: Types and Interfaces

const toExceptionResult = (e: unknown): KeyValidationResult => ({
    ok: false,
    message: e instanceof Error ? e.message : String(e),
})

const toFailureResult = async (res: Response): Promise<KeyValidationResult> => {
    let body
    try {
        body = await res.json()
    } catch {
        body = undefined
    }
    const {error} = (body ?? {}) as ProviderErrorBody

    return {
        ok: false,
        status: res.status,
        message: error?.message,
    }
}

export const isOpenAIKeyValid = async (key: string): Promise<KeyValidationResult> => {
    try {
        // Just call the "list models" API with the supplied key. Except for error reporting,  we don't care about the
        // result, just whether it succeeds or not.
        const res = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${key}`,
            },
        })

        return res.ok ? {ok: true} : await toFailureResult(res)
    } catch (e) {
        console.error("Error validating API key:", e)
        return toExceptionResult(e)
    }
}

export const isAnthropicKeyValid = async (key: string): Promise<KeyValidationResult> => {
    try {
        // Just call the "list models" API with the supplied key.
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

        return res.ok ? {ok: true} : await toFailureResult(res)
    } catch (e) {
        console.error("Error validating API key:", e)
        return toExceptionResult(e)
    }
}

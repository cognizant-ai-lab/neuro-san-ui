//#region: Types and Interfaces

/**
 * Result of testing an API key. On failure, {@link status} and {@link message} carry whatever
 * detail could be recovered. (A discriminated union would model this better, but this project
 * runs with `strictNullChecks: false`, under which the `ok` discriminant does not narrow.)
 */
export interface KeyValidationResult {
    ok: boolean
    status?: number
    message?: string
}

/** The parts of the provider error body we read; both OpenAI and Anthropic nest it as `{error: {message}}`. */
interface ProviderErrorBody {
    error?: {message?: string}
}

//#endregion: Types and Interfaces

/**
 * Read the provider's error message from a failed response, tolerating empty or non-JSON
 * bodies (which cause {@link Response.json} to reject).
 * @param res The failed response.
 * @return The provider's error message, or `undefined` if none could be parsed.
 */
const readErrorMessage = async (res: Response): Promise<string | undefined> => {
    try {
        const body: ProviderErrorBody | null = await res.json()
        return body?.error?.message
    } catch {
        return undefined
    }
}

/**
 * Validate an API key by calling a provider's authenticated "list models" endpoint. The status is
 * all we need: a 2xx means the key works; any other response is a failure whose status and message
 * we surface. A thrown error (network failure, CORS rejection) is likewise reported as a failure.
 * @param url The provider's "list models" endpoint.
 * @param headers Request headers, including authentication for the supplied key.
 * @return A {@link KeyValidationResult} describing the outcome.
 */
const validateKey = async (url: string, headers: HeadersInit): Promise<KeyValidationResult> => {
    try {
        const res = await fetch(url, {method: "GET", headers})
        if (res.ok) {
            return {ok: true}
        }
        return {ok: false, status: res.status, message: await readErrorMessage(res)}
    } catch (e) {
        console.error("Error validating API key:", e)
        return {ok: false, message: e instanceof Error ? e.message : String(e)}
    }
}

export const isOpenAIKeyValid = (key: string): Promise<KeyValidationResult> =>
    validateKey("https://api.openai.com/v1/models", {
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
    })

export const isAnthropicKeyValid = (key: string): Promise<KeyValidationResult> =>
    validateKey("https://api.anthropic.com/v1/models", {
        Accept: "application/json",
        "anthropic-version": "2023-06-01",
        "X-Api-Key": key,
        // Anthropic rejects direct browser-origin requests unless this header is present.
        // https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/
        "anthropic-dangerous-direct-browser-access": "true",
    })

/**
 * For text processing utility functions
 */

/**
 * Tests if input contains only whitespace (meaning, not a valid query)
 *
 * @param input Input to be tested
 * @returns True if input contains only whitespace, false otherwise
 */
export function hasOnlyWhitespace(input: string) {
    return input.trim().length === 0
}

/* eslint-disable max-len */
/**
 * Extracts the ID from a model ID
 *
 * @param modelId Model ID to be processed, eg. `"prescriptor-67fb86d3-9047-4ce0-0d42-4e3d3b0f715e-83_28"`
 * @param modelType Type of model -- `"prescriptor"` or `"rio"`
 * @returns Model ID with the last hyphenated item removed (eg. `"67fb86d3-9047-4ce0-0d42-4e3d3b0f715e"`)

 * @example
 * ```
 * removeLast("prescriptor-67fb86d3-9047-4ce0-0d42-4e3d3b0f715e-83_28", "prescriptor") = "67fb86d3-9047-4ce0-0d42-4e3d3b0f715e"
 * ```
 */
/* eslint-enable max-len */
export function extractId(modelId: string, modelType: "prescriptor" | "rio"): string {
    if (!modelId || !modelType || !modelId.includes(modelType)) {
        return ""
    }

    // conflicts with ESLint newline-per-chained-call rule
    // prettier-ignore
    return modelId.substring(`${modelType}-`.length) // remove the model type
        .split("-")     // split by hyphens
        .slice(0, -1)   // remove the last element
        .join("-") // join with hyphens
}

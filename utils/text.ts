/**
 * For text processing utility functions
 */

/**
 * Tests if input contains only whitespace (meaning, not a valid query)
 *
 * @param input Input to be tested
 * @returns True if input contains only whitespace, false otherwise
 */
export function isEmptyExceptForWhitespace(input: string) {
    return input.trim().length === 0
}

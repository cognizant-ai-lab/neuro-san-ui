/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Helpers for viewing and editing sly_data as JSON.
 *
 * sly_data is the side-channel payload that travels with each request to an agent network. It never reaches the LLM,
 * but coded tools read from and write to it. It is "super loose": any JSON object the agent network cares to define.
 */

// How many levels deep to look for image values. Deep enough for realistic payloads, shallow enough that a
// pathological structure can't lock up the browser.
const MAX_IMAGE_SEARCH_DEPTH = 6

// Upper bound on how many images we will display, to keep the dialog usable.
const MAX_IMAGE_RESULTS = 20

// Prefix of a base64-encoded image supplied as a data URI, eg. "data:image/png;base64,iVBORw0KG..."
const IMAGE_DATA_URI_PREFIX = "data:image/"

// File extensions we recognize as images when a value is an http(s) URL
const IMAGE_FILE_EXTENSIONS = [".apng", ".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]

/**
 * An image found somewhere inside a sly_data payload.
 */
export interface SlyDataImage {
    /** Where the image was found, as a readable key path, eg. `"report.charts[0]"` */
    readonly path: string

    /** The value itself, suitable for use as the `src` of an `img` element */
    readonly src: string
}

/**
 * The outcome of parsing user-supplied sly_data text.
 * @note Deliberately not a discriminated union: this repo compiles with `strictNullChecks` off, where narrowing on
 * a boolean discriminant is unreliable.
 */
export interface SlyDataParseResult {
    /** Why the text cannot be used as sly_data, or undefined if it parsed fine */
    readonly error?: string

    /** The parsed sly_data. Empty when `error` is set. */
    readonly value: Record<string, unknown>
}

/**
 * Renders sly_data as pretty-printed JSON for display in an editor.
 * @param data The sly_data to render. May be undefined, in which case an empty object is rendered.
 * @returns The sly_data as indented JSON text.
 */
export const formatSlyData = (data?: Record<string, unknown>): string => JSON.stringify(data ?? {}, null, 2)

/**
 * Parses sly_data text supplied by the user, rejecting anything that is not a JSON object.
 * <br>
 * The root has to be an object because that is what the server expects: sly_data is a map of keys to values, and
 * an array or a primitive at the root cannot be merged with the entries the UI itself supplies (API keys, login...).
 * @param text The text to parse. Empty or whitespace-only text is treated as an empty object.
 * @returns The parsed object, or a message describing why the text is not usable as sly_data.
 */
export const parseSlyData = (text: string): SlyDataParseResult => {
    const trimmed = text?.trim() ?? ""

    if (trimmed.length === 0) {
        return {value: {}}
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(trimmed)
    } catch (error: unknown) {
        return {error: error instanceof Error ? error.message : "Invalid JSON.", value: {}}
    }

    if (Array.isArray(parsed)) {
        return {error: "Sly data must be a JSON object, not an array.", value: {}}
    }

    if (parsed === null || typeof parsed !== "object") {
        return {error: "Sly data must be a JSON object, not a primitive value.", value: {}}
    }

    return {value: parsed as Record<string, unknown>}
}

/**
 * Determines whether a string value looks like something we can display as an image.
 * @param value The string to test.
 * @returns True if the value is an image data URI or an http(s) URL with an image file extension.
 */
const isImageValue = (value: string): boolean => {
    if (value.startsWith(IMAGE_DATA_URI_PREFIX)) {
        return true
    }

    if (!value.startsWith("http://") && !value.startsWith("https://")) {
        return false
    }

    // Ignore any query string or fragment so that eg. "https://example.com/a.png?size=large" still matches
    const withoutQuery = value.split("?", 1)[0].split("#", 1)[0].toLowerCase()
    return IMAGE_FILE_EXTENSIONS.some((extension) => withoutQuery.endsWith(extension))
}

/**
 * Finds every value inside a sly_data payload that can be displayed as an image.
 * <br>
 * This is the extension point for image support: agent networks do not yet have an agreed convention for passing
 * images over sly_data, so we recognize the two encodings that are unambiguous today (data URIs and image URLs).
 * Supporting a new encoding means teaching {@link isImageValue} about it -- nothing else needs to change.
 * @param data Any part of a sly_data payload. Objects and arrays are searched recursively.
 * @returns The images found, in document order, capped at a sane maximum.
 */
export const findImageValues = (data: unknown): readonly SlyDataImage[] => {
    const found: SlyDataImage[] = []

    const walk = (value: unknown, path: string, depth: number): void => {
        if (depth > MAX_IMAGE_SEARCH_DEPTH || found.length >= MAX_IMAGE_RESULTS) {
            return
        }

        if (typeof value === "string") {
            if (isImageValue(value)) {
                found.push({path, src: value})
            }
            return
        }

        if (Array.isArray(value)) {
            value.forEach((item: unknown, index: number) => walk(item, `${path}[${index}]`, depth + 1))
            return
        }

        if (value !== null && typeof value === "object") {
            Object.entries(value).forEach(([key, item]: [string, unknown]) =>
                walk(item, path.length > 0 ? `${path}.${key}` : key, depth + 1)
            )
        }
    }

    walk(data, "", 0)

    return found
}

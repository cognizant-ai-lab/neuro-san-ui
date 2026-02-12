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
 * For text processing utility functions
 */

import {createHash} from "crypto"

/**
 * Tests if input contains only whitespace (meaning, not a valid query)
 *
 * @param input Input to be tested
 * @returns True if input contains only whitespace, false otherwise
 */
export const hasOnlyWhitespace = (input: string) => input?.trim().length === 0

/**
 * Extracts the ID from a model ID
 *
 * @param modelId Model ID to be processed, eg. `"prescriptor-67fb86d3-9047-4ce0-0d42-4e3d3b0f715e-83_28"`
 * @param modelType Type of model -- `"prescriptor"` or `"rio"`
 * @returns Model ID with the last hyphenated item removed (eg. `"67fb86d3-9047-4ce0-0d42-4e3d3b0f715e"`)

 * @example
 * ```
 * removeLast("prescriptor-67fb86d3-9047-4ce0-0d42-4e3d3b0f715e-83_28", "prescriptor")
 *  = "67fb86d3-9047-4ce0-0d42-4e3d3b0f715e"
 * ```
 */
export const extractId = (modelId: string, modelType: "prescriptor" | "rio"): string => {
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

/**
 * Hashes a string using MD5. For example: for generating keys for React nodes from a longer string identifer.
 *
 * @param input String to be hashed
 * @returns Hashed string
 */
export const hashString = (input: string): string => {
    // prettier-ignore
    return createHash("md5")
        .update(input)
        .digest("hex")
}

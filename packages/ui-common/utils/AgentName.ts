/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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
 * One-stop shop for agent-network name manipulation. Two directions live here:
 *
 *  - Canonical/raw → human display: {@link removeTrailingUuid}, {@link cleanUpAgentName}, {@link toDisplayName}
 *    and {@link filenameToNetworkName} turn a raw agent name, reservation_id, or exported filename into
 *    the beautified name shown in the UI.
 *  - Display → canonical/API: {@link networkNameToApiName} turns a user-facing name back into the
 *    underscore-delimited form the backend echoes as `agent_network_name`.
 *
 * The name-collision helpers ({@link normalizeNetworkNameForComparison}, {@link networkNamesConflict},
 * {@link nextAvailableNetworkName}) compare names across those forms so the display name "My Network (2)"
 * and its API form "My_Network_2" are treated as equal.
 */

import startCase from "lodash-es/startCase"

import {splitFilename} from "./File"

/**
 * Trailing UUID on an agent name, reservation_id, or filename stem.
 *
 * Each separator is `[_-]` because the canonical form is hyphen-delimited (e.g.
 * `copy_cat-hello_world-14ecb260-4389-44f3-afad-ea315dfa1966`), but filename sanitization
 * (`toSafeFilename`, neuro-san exports) flattens those hyphens to underscores. Matching either
 * separator strips the UUID in both forms.
 */
const TRAILING_UUID_PATTERN =
    /[_-][0-9a-fA-F]{8}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{12}$/u

/**
 * Strip a trailing UUID appended to an agent name or reservation_id, e.g.
 * `copy_cat-hello_world-14ecb260-4389-44f3-afad-ea315dfa1966` → `copy_cat-hello_world`.
 */
export const removeTrailingUuid = (agentName: string): string => agentName?.replace(TRAILING_UUID_PATTERN, "")

/**
 * Convert FOO_BAR to more human "Foo Bar".
 * @param agentName Agent name in SNAKE_CASE format.
 * @returns User-friendly agent name.
 */
export const cleanUpAgentName = (agentName: string): string => startCase(agentName)

/**
 * Beautify a raw agent name for display: strip any trailing UUID and title-case the rest
 * (e.g. `my_network_683b0dfb_4816_464d_9c83_7e59ce6497d3` → `My Network`). With `useNativeNames`
 * on, the raw name is returned verbatim to match the appearance preference honored across the app.
 */
export const toDisplayName = (rawName: string, useNativeNames = false): string =>
    useNativeNames ? rawName : cleanUpAgentName(removeTrailingUuid(rawName))

/**
 * Derive a network name from a filename. Drops the extension, then applies {@link toDisplayName}
 * to the stem (e.g. `my_network_683b0dfb_4816_464d_9c83_7e59ce6497d3.json` → `My Network`).
 */
export const filenameToNetworkName = (filename: string, useNativeNames = false): string =>
    toDisplayName(splitFilename(filename).name, useNativeNames)

/**
 * Convert a user-facing network name into the API form the backend echoes as `agent_network_name`.
 *
 * The UI splits `agent_network_name` on underscores to produce display names, so spaces become
 * underscores. Parentheses around an auto-appended index ("My Network (2)") are dropped so the API
 * name reads "My_Network_2".
 */
export const networkNameToApiName = (displayName: string): string =>
    displayName.trim().replaceAll(" ", "_").replaceAll(/[()]/gu, "")

/**
 * Normalize a network name for conflict comparison: underscores, hyphens, parentheses and whitespace
 * all collapse to single spaces, so the display form "My Network (2)" and its API form "My_Network_2"
 * compare equal.
 */
export const normalizeNetworkNameForComparison = (rawName: string): string =>
    rawName
        .replaceAll(/[\s_()-]+/gu, " ")
        .toLowerCase()
        .trim()

/** True if two network names refer to the same network once normalized for comparison. */
export const networkNamesConflict = (a: string, b: string): boolean =>
    normalizeNetworkNameForComparison(a) === normalizeNetworkNameForComparison(b)

/**
 * Pick the first non-colliding name by appending an incrementing index (" (2)", " (3)", …).
 *
 * Starts at 2 and skips any index already in use, so importing "My Network" alongside an existing
 * "My Network" yields "My Network (2)" — or "My Network (3)" if "My Network (2)" is also taken.
 */
export const nextAvailableNetworkName = (baseName: string, existingNames: readonly string[]): string => {
    const taken = new Set(existingNames.map((existing) => normalizeNetworkNameForComparison(existing)))
    let index = 2
    while (taken.has(normalizeNetworkNameForComparison(`${baseName} (${index})`))) {
        index += 1
    }
    return `${baseName} (${index})`
}

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
 * One-stop shop for turning a raw agent-network name (or reservation_id) into the beautified name
 * shown in the UI: {@link removeTrailingUuid}, {@link cleanUpAgentName} and {@link toDisplayName}.
 */

import startCase from "lodash-es/startCase"

/**
 * Trailing UUID on an agent name or reservation_id.
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

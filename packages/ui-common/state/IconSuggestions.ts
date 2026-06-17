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

import {create} from "zustand"
import {persist} from "zustand/middleware"

import {AgentIconSuggestions} from "../controller/Types/AgentIconSuggestions"
import {NetworkIconSuggestions} from "../controller/Types/NetworkIconSuggestions"

// Store this many suggestions of each type before we start discarding the oldest ones.
const MAX_SUGGESTIONS = 250

/**
 * Zustand state store for temporary networks, such as vibe coded networks created by the user.
 */
interface IconSuggestionsStore {
    readonly networkIconSuggestions: NetworkIconSuggestions
    readonly setNetworkIconSuggestions: (networkIconSuggestions: NetworkIconSuggestions) => void
    readonly agentIconSuggestions: AgentIconSuggestions
    readonly setAgentIconSuggestions: (agentIconSuggestions: AgentIconSuggestions) => void
}

/**
 * Combines new suggestions with existing ones and truncates the result to MAX_SUGGESTIONS (cache eviction)
 *
 * @param current - The current suggestion object.
 * @param newSuggestions - The new suggestions to add.
 * @returns The updated and trimmed suggestion object.
 **/
const updateSuggestions = <T extends object>(current: T, newSuggestions: T): T => {
    const combined = {...current, ...newSuggestions}
    const entries = Object.entries(combined)

    if (entries.length > MAX_SUGGESTIONS) {
        const sliced = entries.slice(entries.length - MAX_SUGGESTIONS)
        return Object.fromEntries(sliced) as T
    }

    return combined
}

/**
 * The hook that lets apps use the store.
 */
export const useIconSuggestionsStore = create<IconSuggestionsStore>()(
    persist(
        (set) => ({
            networkIconSuggestions: {},
            setNetworkIconSuggestions: (newSuggestions) =>
                set((state) => ({
                    networkIconSuggestions: updateSuggestions(state.networkIconSuggestions, newSuggestions),
                })),
            agentIconSuggestions: {},
            setAgentIconSuggestions: (newSuggestions) =>
                set((state) => ({
                    agentIconSuggestions: updateSuggestions(state.agentIconSuggestions, newSuggestions),
                })),
        }),
        {
            name: "icon-suggestions-store",
        }
    )
)

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
import {merge} from "lodash-es"
import {create} from "zustand"
import {persist} from "zustand/middleware"

import {PaletteKey} from "../Theme/Palettes"

/**
 * A utility type that makes all properties in T deeply optional, since TypeScript's built-in Partial<T>
 * only makes the top-level properties optional.
 *
 * We use it in conjunction with `lodash.merge` to allow partial updates to nested settings objects. TypeScript doesn't
 * know that `lodash.merge` will fill in the missing properties at runtime, so we need this shim to avoid type errors.
 */
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * User preference settings
 */
interface Settings {
    appearance: {
        agentIconColor: string
        agentNodeColor: string
        plasmaColor: string
        rangePalette: PaletteKey
    }
}

/**
 * Zustand state store for user preferences/Settings
 */
interface SettingsStore {
    settings: Settings
    updateSettings: (updates: DeepPartial<Settings>) => void
    resetSettings: () => void
}

/**
 * Default settings, used on first load and on reset
 */
export const DEFAULT_SETTINGS: Settings = {
    appearance: {
        // CSS variables like --bs-green don't work here. TBD why.
        agentNodeColor: "#2db81f",
        agentIconColor: "black",
        rangePalette: "blue",
        plasmaColor: "#2db81f",
    },
}

/**
 * The hook that lets apps use the store
 */
export const useSettingsStore = create<SettingsStore>()(
    // zustand persists to localStorage by default
    persist(
        (set) => ({
            settings: DEFAULT_SETTINGS,
            updateSettings: (updates) =>
                set((state) => ({
                    settings: merge({}, state.settings, updates),
                })),
            resetSettings: () => set({settings: DEFAULT_SETTINGS}),
        }),
        {
            name: "app-settings",
        }
    )
)

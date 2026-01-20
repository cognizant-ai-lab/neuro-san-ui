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

import {create} from "zustand"
import {persist} from "zustand/middleware"

/**
 * User preference settings
 */
export interface Settings {
    appearance: {
        agentIconColor: string
        agentNodeColor: string
        plasmaColor: string
        rangePalette: string
    }
}

/**
 * Zustand state store for user preferences/Settings
 */
export interface SettingsStore {
    settings: Settings
    updateSettings: (updates: Partial<Settings>) => void
    resetSettings: () => void
}

const DEFAULT_SETTINGS: Settings = {
    appearance: {
        // globals.css variables like --bs-green don't work here. TBD why.
        agentNodeColor: "#2db81f",
        agentIconColor: "#ffffff",
        rangePalette: "blue",
        plasmaColor: "#2db81f",
    },
}

/**
 * The hook that lets apps use the store
 */
export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            settings: DEFAULT_SETTINGS,
            updateSettings: (updates) =>
                set((state) => ({
                    settings: {...state.settings, ...updates},
                })),
            resetSettings: () => set({settings: DEFAULT_SETTINGS}),
        }),
        {
            name: "app-settings",
        }
    )
)

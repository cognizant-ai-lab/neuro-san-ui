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

import {PALETTES} from "../Theme/Palettes"

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

export type LLMProvider = "OpenAI" | "Anthropic"
export type LogoSource = "none" | "generic" | "auto"

// Mapping of LLM providers to their corresponding API key field names in the settings store.
export const LLM_PROVIDER_API_KEY_FIELD = {
    OpenAI: "openai_api_key",
    Anthropic: "anthropic_api_key",
} as const satisfies Record<LLMProvider, string>

// Type representing the API key field name for a given LLM provider, derived from the mapping above.
// Not to be confused: API "key" vs. the "key" in the map.
export type ByokKeyField = (typeof LLM_PROVIDER_API_KEY_FIELD)[LLMProvider]

/**
 * User preference settings
 */
interface Settings {
    readonly appearance: {
        readonly agentIconColor: string
        readonly agentNodeColor: string
        readonly autoAgentIconColor: boolean
        readonly plasmaColor: string
        readonly rangePalette: PaletteKey
        readonly useNativeNames: boolean
    }
    readonly branding: {
        readonly customer: string | null
        readonly primary: string | null
        readonly secondary: string | null
        readonly background: string | null
        readonly rangePalette: string[] | null
        readonly iconSuggestion: string | null
        readonly logoSource: LogoSource
    }
    readonly behavior: {
        readonly enableZenMode: boolean
    }
    readonly apiKeys: Partial<Record<LLMProvider, string>>
    readonly externalServices: {
        neuroSanUrl: string | null
    }
}

/**
 * Zustand state store for user preferences/Settings
 */
interface SettingsStore {
    readonly settings: Settings
    readonly updateSettings: (updates: DeepPartial<Settings>) => void
    readonly resetSettings: () => void
}

/**
 * Default settings, used on first load and on reset
 */
export const DEFAULT_SETTINGS: Settings = {
    appearance: {
        // CSS variables like --bs-green don't work here. TBD why.
        agentNodeColor: "#2db81f",
        agentIconColor: "black",
        autoAgentIconColor: true,
        rangePalette: "blue",
        plasmaColor: "#2db81f",
        useNativeNames: false,
    },
    branding: {
        background: null,
        customer: null,
        iconSuggestion: null,
        logoSource: "none",
        primary: null,
        rangePalette: null,
        secondary: null,
    },
    behavior: {
        enableZenMode: true,
    },
    apiKeys: {},
    externalServices: {
        neuroSanUrl: null,
    },
}
const APP_SETTINGS_STORAGE_KEY = "app-settings"
const SESSION_API_KEYS_STORAGE_KEY = "app-settings-api-keys"

/**
 * Purges any persisted API keys from localStorage. This cleans up from previous versions of the cdoe.
 */
const purgePersistedApiKeys = () => {
    // Protect against non-browser, SSR, test environments etc.
    if (typeof sessionStorage === "undefined") {
        return
    }

    const persisted = JSON.parse(localStorage.getItem(APP_SETTINGS_STORAGE_KEY) ?? "{}")

    if (persisted.state?.settings) {
        delete persisted.state.settings.apiKeys
        localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(persisted))
    }
}

/**
 * The hook that lets apps use the store
 */
export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            settings: DEFAULT_SETTINGS,
            updateSettings: (updates) =>
                set((state) => {
                    const nextSettings = merge({}, state.settings, updates)

                    // Side effect: persist API keys in sessionStorage, unlike other Settings items which are persisted
                    // to localStorage (zustand default)
                    if (updates.apiKeys && typeof sessionStorage !== "undefined") {
                        sessionStorage.setItem(SESSION_API_KEYS_STORAGE_KEY, JSON.stringify(nextSettings.apiKeys))
                    }

                    return {
                        settings: nextSettings,
                    }
                }),
            resetSettings: () => set({settings: DEFAULT_SETTINGS}),
        }),
        {
            name: APP_SETTINGS_STORAGE_KEY,

            // We don't want to persist API keys in localStorage, so we remove them before saving the state.
            partialize: (state) => {
                const {apiKeys: _apiKeys, ...settingsWithoutApiKeys} = state.settings

                return {
                    ...state,
                    settings: settingsWithoutApiKeys,
                }
            },

            merge: (persistedState, currentState) => {
                // This is the hook that runs when the store is rehydrated from localStorage.
                // We use it to purge any persisted API keys from previous versions of the code.
                purgePersistedApiKeys()

                // Merge persisted settings with defaults to fill in any missing fields
                const sessionApiKeys =
                    typeof sessionStorage === "undefined"
                        ? {}
                        : JSON.parse(sessionStorage.getItem(SESSION_API_KEYS_STORAGE_KEY) ?? "{}")

                const persistedSettings = (persistedState as Partial<SettingsStore>).settings ?? {}

                return {
                    ...currentState,
                    settings: merge({}, DEFAULT_SETTINGS, persistedSettings, {
                        apiKeys: sessionApiKeys,
                    }),
                }
            },
        }
    )
)

export type PaletteKey = keyof typeof PALETTES | "brand"

/**
 * Custom hook to get the current color palette based on user settings.
 * If the user has selected custom branding, it will return the palette for that.
 * Otherwise, it will return one of the predefined palettes from the PALETTES object based on the user's selection.
 *
 * @returns An array of color hex codes representing the current color palette.
 */
export const usePalette = () => {
    const brandPalette = useSettingsStore((state: SettingsStore) => state.settings.branding.rangePalette)
    const paletteKey = useSettingsStore((state: SettingsStore) => state.settings.appearance.rangePalette)

    if (paletteKey === "brand" && brandPalette) {
        return brandPalette
    } else {
        return PALETTES[paletteKey as keyof typeof PALETTES]
    }
}

import {renderHook} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {
    APP_SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
    getApiKey,
    LEGACY_APPEARANCE_DEFAULTS,
    SESSION_API_KEYS_STORAGE_KEY,
    usePalette,
    useSettingsStore,
} from "../../../state/Settings"
import {PALETTES} from "../../../Theme/Palettes"

describe("Settings", () => {
    withStrictMocks()

    beforeEach(() => {
        useSettingsStore.getState().resetSettings()
    })

    const reloadSettingsStore = async () => {
        // Reset modules to ensure the store is re-imported and reads from sessionStorage
        vi.resetModules()

        // Re-import the store after resetting modules to ensure it reads from sessionStorage again
        const {useSettingsStore: freshUseSettingsStore} = await import("../../../state/Settings")

        // The expired API key should be purged on rehydration, so the store should not have any API keys
        expect(freshUseSettingsStore.getState().settings.apiKeys).toEqual({})
    }

    describe("ApiKeys", () => {
        it("should filter out expired keys", async () => {
            const openAIKeyValue = "valid-key"
            useSettingsStore.getState().updateSettings({
                apiKeys: {
                    OpenAI: {
                        value: openAIKeyValue,
                        expiresAt: Number.MAX_SAFE_INTEGER, // "never" expires
                    },
                    Anthropic: {
                        value: "expired-key",
                        expiresAt: Date.now() - 1000, // expired 1 second ago
                    },
                },
            })

            const apiKeys = useSettingsStore.getState().settings.apiKeys
            expect(Object.keys(apiKeys).length).toBe(2)

            expect(getApiKey(apiKeys, "OpenAI")).toBe(openAIKeyValue)
            expect(getApiKey(apiKeys, "Anthropic")).toBeUndefined()
        })

        it("should purge legacy keys persisted in localStorage on hydrate", async () => {
            localStorage.setItem(
                APP_SETTINGS_STORAGE_KEY,
                JSON.stringify({
                    state: {settings: {apiKeys: {OpenAI: {value: "legacy-key"}}}},
                })
            )

            await reloadSettingsStore()

            // The persisted state in localStorage should also not have any API keys
            const persisted = JSON.parse(localStorage.getItem(APP_SETTINGS_STORAGE_KEY) ?? "{}")
            expect(persisted.state.settings.apiKeys).toBeUndefined()
        })

        it("Purges expired keys on rehydration", async () => {
            const expiredKey = {
                value: "expired-key",
                expiresAt: Date.now() - 1000, // expired 1 second ago
            }

            // Store an expired key in sessionStorage
            sessionStorage.setItem(SESSION_API_KEYS_STORAGE_KEY, JSON.stringify({OpenAI: expiredKey}))

            await reloadSettingsStore()

            // The persisted state in sessionStorage should also not have any API keys
            const persistedSession = JSON.parse(sessionStorage.getItem(SESSION_API_KEYS_STORAGE_KEY) ?? "{}")
            expect(persistedSession).toEqual({})
        })

        it("persists API keys only in sessionStorage", () => {
            const openAIKeyValue = "valid-key"
            useSettingsStore.getState().updateSettings({
                apiKeys: {
                    OpenAI: {
                        value: openAIKeyValue,
                        expiresAt: Number.MAX_SAFE_INTEGER, // "never" expires
                    },
                },
            })

            const storedApiKeys = JSON.parse(sessionStorage.getItem(SESSION_API_KEYS_STORAGE_KEY) ?? "{}")
            expect(storedApiKeys.OpenAI.value).toBe(openAIKeyValue)

            const persisted = JSON.parse(localStorage.getItem(APP_SETTINGS_STORAGE_KEY) ?? "{}")
            expect(persisted.state.settings.apiKeys).toBeUndefined()
        })
    })

    describe("Settings persistence", () => {
        it("persists non-API key settings in localStorage", () => {
            const agentIconColor = "#112233"
            useSettingsStore.getState().updateSettings({
                appearance: {
                    agentIconColor,
                },
            })

            const persisted = JSON.parse(localStorage.getItem(APP_SETTINGS_STORAGE_KEY) ?? "{}")
            expect(persisted.state.settings.appearance.agentIconColor).toBe(agentIconColor)
        })

        it("handles persisted empty settings gracefully", async () => {
            localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify({state: {settings: null}}))

            await reloadSettingsStore()

            const settings = useSettingsStore.getState().settings
            expect(settings).toEqual(DEFAULT_SETTINGS)
        })

        it("upgrades untouched pre-reskin appearance defaults but keeps user customizations", async () => {
            const customNodeColor = "#123456"
            localStorage.setItem(
                APP_SETTINGS_STORAGE_KEY,
                JSON.stringify({
                    state: {
                        settings: {
                            appearance: {
                                ...LEGACY_APPEARANCE_DEFAULTS,
                                agentNodeColor: customNodeColor,
                                layout: "linear",
                            },
                        },
                    },
                })
            )

            vi.resetModules()
            const {useSettingsStore: freshUseSettingsStore} = await import("../../../state/Settings")
            const {appearance} = freshUseSettingsStore.getState().settings

            // Legacy defaults are replaced by the new defaults...
            expect(appearance.agentIconColor).toBe(DEFAULT_SETTINGS.appearance.agentIconColor)
            expect(appearance.plasmaColor).toBe(DEFAULT_SETTINGS.appearance.plasmaColor)
            expect(appearance.rangePalette).toBe(DEFAULT_SETTINGS.appearance.rangePalette)

            // ...while values the user changed are preserved
            expect(appearance.agentNodeColor).toBe(customNodeColor)
            expect(appearance.layout).toBe("linear")
        })
    })

    describe("usePalette", () => {
        it("returns the selected built-in palette", () => {
            useSettingsStore.getState().updateSettings({appearance: {rangePalette: "blue"}})
            const {result} = renderHook(() => usePalette())
            expect(result.current).toBe(PALETTES.blue)
        })

        it("returns the brand palette when brand is selected and defined", () => {
            const rangePalette = ["#111111", "#222222"]
            useSettingsStore.getState().updateSettings({
                appearance: {rangePalette: "brand"},
                branding: {rangePalette},
            })
            const {result} = renderHook(() => usePalette())
            expect(result.current).toEqual(rangePalette)
        })
    })
})

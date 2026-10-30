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

import {useTheme} from "@mui/material/styles"
import {useCallback, useEffect, useMemo, useRef, useState} from "react"

import {
    isAnthropicKeyValid,
    isGoogleKeyValid,
    isKeyValidationFailure,
    isOpenAIKeyValid,
    KeyValidationFailure,
    KeyValidationResult,
} from "../../../controller/llm/Providers"
import {API_KEYS_TTL_MS, getApiKey, LLMProvider, useSettingsStore} from "../../../state/Settings"
import {ApiKeyFailure} from "../ApiKeyErrorBanner"
import {useCheckmarkFade} from "../FadingCheckmark"

type CheckmarkFade = ReturnType<typeof useCheckmarkFade>
export type ApiKeysMap = Parameters<typeof getApiKey>[0]

interface LLMProviderDefinition {
    readonly getLogo: (isDarkMode: boolean) => string
    readonly idSuffix: string
    readonly onTest: (key: string) => Promise<KeyValidationResult>
    readonly placeholder: string
    readonly vendor: LLMProvider
}

const PROVIDER_DEFINITIONS: readonly LLMProviderDefinition[] = [
    {
        getLogo: (isDarkMode) => (isDarkMode ? "/OpenAI-white.png" : "/OpenAI-black.png"),
        idSuffix: "openai",
        onTest: isOpenAIKeyValid,
        placeholder: "sk-...",
        vendor: "OpenAI",
    },
    {
        getLogo: () => "/claude.png",
        idSuffix: "anthropic",
        onTest: isAnthropicKeyValid,
        placeholder: "sk-ant-...",
        vendor: "Anthropic",
    },
    {
        getLogo: () => "/gemini.svg",
        idSuffix: "google",
        onTest: isGoogleKeyValid,
        placeholder: "AQ....",
        vendor: "Google",
    },
]

export interface ByokProviderItem {
    /** Checkmark fade controller for save indicator. */
    readonly checkmark: CheckmarkFade
    /** Unique DOM ID suffix for the provider. */
    readonly idSuffix: string
    /** Provider logo asset URL. */
    readonly logo: string
    /** Test handler for validating keys. */
    readonly onTest: (key: string) => Promise<KeyValidationResult>
    /** Input placeholder text. */
    readonly placeholder: string
    /** LLM provider identifier. */
    readonly vendor: LLMProvider
}

export interface UseByokKeyManagerProps {
    /** Callback invoked when the parent dialog closes. */
    readonly onClose?: () => void
    /** Optional filter for supported providers. */
    readonly supportedProviders?: ReadonlySet<LLMProvider>
}

export interface UseByokKeyManagerReturn {
    /** Active provider input configurations. */
    readonly activeConfigs: readonly ByokProviderItem[]
    /** Persisted API keys from settings store. */
    readonly apiKeys: ApiKeysMap | undefined
    /** Handler for closing the dialog, prompting confirmation if unsaved edits exist. */
    readonly handleClose: () => void
    /** Handler for discarding unsaved changes and closing the dialog. */
    readonly handleDiscard: () => void
    /** Handler for updating validation failure results for a vendor. */
    readonly handleKeyResultChange: (vendor: LLMProvider, result: KeyValidationFailure | null) => void
    /** Handler for saving all unsaved changes and closing the dialog. */
    readonly handleSave: () => Promise<void>
    /** Handler for updating draft key values when inputs change. */
    readonly handleValueChange: (vendor: LLMProvider, value: string) => void
    /** Current validation failures for active providers. */
    readonly keyFailures: readonly ApiKeyFailure[]
    /** Persists a single API key to settings store. */
    readonly persistKey: (vendor: LLMProvider, key: string, checkmark: CheckmarkFade, now: number) => Promise<boolean>
    /** Whether the unsaved changes confirmation modal is currently visible. */
    readonly showUnsavedChangesModal: boolean
}

/**
 * Custom hook managing the state, validation, and lifecycle for Bring Your Own Key (BYOK) inputs.
 * Tracks unsaved drafts and prompts before closing when unpersisted changes exist.
 *
 * @param props Hook options
 * @param props.onClose Callback invoked when the parent dialog closes
 * @param props.supportedProviders Optional filter for supported providers
 * @return State and callbacks for managing BYOK inputs and confirmation modal
 */
export const useByokKeyManager = ({onClose, supportedProviders}: UseByokKeyManagerProps): UseByokKeyManagerReturn => {
    const theme = useTheme()
    const openAIKeyCheckmark = useCheckmarkFade()
    const anthropicKeyCheckmark = useCheckmarkFade()
    const googleCheckmark = useCheckmarkFade()

    const apiKeys = useSettingsStore((state) => state.settings.apiKeys)
    const updateSettings = useSettingsStore((state) => state.updateSettings)

    const [keyTestResults, setKeyTestResults] = useState<Partial<Record<LLMProvider, ApiKeyFailure | null>>>({})
    const currentDrafts = useRef<Record<string, string>>({})
    const savingKeys = useRef(new Set<LLMProvider>())
    const [draftKeys, setDraftKeys] = useState<Record<string, string>>({})
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState<boolean>(false)

    useEffect(
        () => () => {
            currentDrafts.current = {}
        },
        []
    )

    const checkmarks = useMemo(
        (): Record<LLMProvider, CheckmarkFade> => ({
            Anthropic: anthropicKeyCheckmark,
            OpenAI: openAIKeyCheckmark,
            Google: googleCheckmark,
        }),
        [anthropicKeyCheckmark, googleCheckmark, openAIKeyCheckmark]
    )

    const isDarkMode = theme.palette.mode === "dark"

    const providerItems: readonly ByokProviderItem[] = useMemo(
        () =>
            PROVIDER_DEFINITIONS.map((def) => ({
                checkmark: checkmarks[def.vendor],
                idSuffix: def.idSuffix,
                logo: def.getLogo(isDarkMode),
                onTest: def.onTest,
                placeholder: def.placeholder,
                vendor: def.vendor,
            })),
        [checkmarks, isDarkMode]
    )

    const activeConfigs = useMemo(
        () => (supportedProviders ? providerItems.filter((c) => supportedProviders.has(c.vendor)) : providerItems),
        [providerItems, supportedProviders]
    )

    const persistKey = useCallback(
        async (vendor: LLMProvider, key: string, checkmark: CheckmarkFade, now: number) => {
            if (savingKeys.current.has(vendor)) {
                return false
            }
            if (key) {
                savingKeys.current.add(vendor)
                const prefix = vendor === "OpenAI" ? "sk-" : vendor === "Anthropic" ? "sk-ant-" : null
                try {
                    const result: KeyValidationResult =
                        prefix && key.split(prefix).length > 2
                            ? {
                                  ok: false,
                                  message:
                                      "This looks like multiple API keys pasted together. " +
                                      "Clear the field and paste one key.",
                              }
                            : await PROVIDER_DEFINITIONS.find((def) => def.vendor === vendor).onTest(key)
                    // An edit or discard while testing invalidates this save.
                    if (currentDrafts.current[vendor] !== key) {
                        return false
                    }
                    setKeyTestResults((prev) => ({
                        ...prev,
                        [vendor]: isKeyValidationFailure(result) ? {vendor, result} : null,
                    }))
                    if (!result.ok) {
                        return false
                    }
                } finally {
                    savingKeys.current.delete(vendor)
                }
            }
            updateSettings({
                apiKeys: {
                    [vendor]: {
                        value: key,
                        expiresAt: key ? now + API_KEYS_TTL_MS : 0,
                    },
                },
            })
            const {[vendor]: _savedDraft, ...remainingDrafts} = currentDrafts.current
            currentDrafts.current = remainingDrafts
            checkmark.trigger()
            setDraftKeys((prev) => {
                const {[vendor]: _, ...rest} = prev
                return rest
            })
            return true
        },
        [updateSettings]
    )

    const handleValueChange = useCallback((vendor: LLMProvider, value: string) => {
        currentDrafts.current[vendor] = value
        setDraftKeys((prev) => ({...prev, [vendor]: value}))
    }, [])

    const handleKeyResultChange = useCallback((vendor: LLMProvider, result: KeyValidationFailure | null) => {
        setKeyTestResults((prev) => ({
            ...prev,
            [vendor]: result ? {result, vendor} : null,
        }))
    }, [])

    const keyFailures: readonly ApiKeyFailure[] = useMemo(
        () =>
            activeConfigs.flatMap(({vendor}) => {
                const failure = keyTestResults[vendor]
                return failure ? [failure] : []
            }),
        [activeConfigs, keyTestResults]
    )

    const getDirtyDrafts = useCallback(
        () =>
            activeConfigs.filter(({vendor}) => {
                const draft = draftKeys[vendor]
                return draft !== undefined && draft !== (getApiKey(apiKeys, vendor) ?? "")
            }),
        [activeConfigs, apiKeys, draftKeys]
    )

    const handleClose = useCallback(() => {
        if (getDirtyDrafts().length > 0) {
            setShowUnsavedChangesModal(true)
        } else {
            onClose?.()
        }
    }, [getDirtyDrafts, onClose])

    const handleDiscard = useCallback(() => {
        currentDrafts.current = {}
        setDraftKeys({})
        setShowUnsavedChangesModal(false)
        onClose?.()
    }, [onClose])

    const handleSave = useCallback(async () => {
        const now = Date.now()
        const drafts = getDirtyDrafts().map(({checkmark, vendor}) => ({checkmark, vendor, key: draftKeys[vendor]}))
        setShowUnsavedChangesModal(false)
        const saved = await Promise.all(
            drafts.map(({checkmark, vendor, key}) => persistKey(vendor, key, checkmark, now))
        )
        if (
            saved.every(Boolean) &&
            activeConfigs.every(
                ({vendor}) =>
                    currentDrafts.current[vendor] === undefined ||
                    currentDrafts.current[vendor] ===
                        (getApiKey(useSettingsStore.getState().settings.apiKeys, vendor) ?? "")
            )
        ) {
            setDraftKeys({})
            onClose?.()
        }
    }, [activeConfigs, getDirtyDrafts, draftKeys, persistKey, onClose])

    return {
        activeConfigs,
        apiKeys,
        handleClose,
        handleDiscard,
        handleKeyResultChange,
        handleSave,
        handleValueChange,
        keyFailures,
        persistKey,
        showUnsavedChangesModal,
    }
}

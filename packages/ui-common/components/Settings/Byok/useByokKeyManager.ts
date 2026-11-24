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

import AltRouteIcon from "@mui/icons-material/AltRoute"
import {useColorScheme, useTheme} from "@mui/material/styles"
import {useCallback, useEffect, useMemo, useRef, useState} from "react"

import {
    isAnthropicKeyValid,
    isGoogleKeyValid,
    isKeyValidationFailure,
    isOpenAIKeyValid,
    KeyValidationFailure,
    KeyValidationResult,
} from "../../../controller/llm/Providers"
import {
    API_KEYS_TTL_MS,
    getApiKey,
    getEndpoint,
    LLM_PROVIDER_API_KEY_FIELD,
    LLM_PROVIDER_ENDPOINT_FIELD,
    LLMProvider,
    useSettingsStore,
} from "../../../state/Settings"
import {isDarkMode} from "../../../Theme/Theme"
import {ApiKeyFailure} from "../ApiKeyErrorBanner"
import {ProviderLogo} from "../ApiKeyInput"
import {useCheckmarkFade} from "../FadingCheckmark"

type CheckmarkFade = ReturnType<typeof useCheckmarkFade>
export type ApiKeysMap = Parameters<typeof getApiKey>[0]
export type ApiEndpointsMap = ReturnType<typeof useSettingsStore.getState>["settings"]["apiEndpoints"]

/**
 * Saves an API key, plus its endpoint URL for providers that have one. Tests the key first unless `allowUnverified`.
 */
export type PersistKey = (
    vendor: LLMProvider,
    key: string,
    endpoint: string,
    checkmark: CheckmarkFade,
    now: number,
    allowUnverified?: boolean
) => Promise<boolean>

const hasEndpoint = (vendor: LLMProvider): boolean => Object.hasOwn(LLM_PROVIDER_ENDPOINT_FIELD, vendor)

/**
 * Returns the other provider with a saved key that is sent in the same `llm_config` field as `vendor`'s key, if any.
 * Only one of them can be saved, since the network can only get one key in that field.
 */
export const getConflictingProvider = (vendor: LLMProvider, apiKeys: ApiKeysMap): LLMProvider | undefined =>
    (Object.keys(LLM_PROVIDER_API_KEY_FIELD) as LLMProvider[]).find(
        (other) =>
            other !== vendor &&
            LLM_PROVIDER_API_KEY_FIELD[other] === LLM_PROVIDER_API_KEY_FIELD[vendor] &&
            Boolean(getApiKey(apiKeys, other))
    )

interface LLMProviderDefinition {
    readonly endpointHelperText?: string
    readonly getLogo: (darkMode: boolean) => ProviderLogo
    readonly idSuffix: string
    readonly onTest: (key: string, endpoint?: string) => Promise<KeyValidationResult>
    readonly placeholder: string
    readonly vendor: LLMProvider
}

const PROVIDER_DEFINITIONS: readonly LLMProviderDefinition[] = [
    {
        getLogo: (darkMode) => (darkMode ? "/OpenAI-white.png" : "/OpenAI-black.png"),
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
    {
        endpointHelperText:
            "Base URL for an LLM router that uses the OpenAI API format, such as LiteLLM or OpenRouter. " +
            "It can't be used with an OpenAI key.",
        getLogo: () => AltRouteIcon,
        idSuffix: "llm-router",
        onTest: isOpenAIKeyValid,
        placeholder: "sk-...",
        vendor: "LLM Router",
    },
]

export interface ByokProviderItem {
    /** Checkmark fade controller for save indicator. */
    readonly checkmark: CheckmarkFade
    /** Help text shown under the endpoint URL while it's being edited. */
    readonly endpointHelperText?: string
    /** Whether the provider has an endpoint URL, saved with its key. */
    readonly hasEndpoint: boolean
    /** Unique DOM ID suffix for the provider. */
    readonly idSuffix: string
    /** Provider logo asset URL, or an icon. */
    readonly logo: ProviderLogo
    /** Test handler for validating keys, against the endpoint URL when one is given. */
    readonly onTest: (key: string, endpoint?: string) => Promise<KeyValidationResult>
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
    /** Persisted endpoint URLs from settings store. */
    readonly apiEndpoints: ApiEndpointsMap
    /** Persisted API keys from settings store. */
    readonly apiKeys: ApiKeysMap | undefined
    /** Handler for closing the dialog, prompting confirmation if unsaved edits exist. */
    readonly handleClose: () => void
    /** Handler for discarding unsaved changes and closing the dialog. */
    readonly clearDrafts: () => void
    readonly handleDiscard: () => void
    /** Handler for updating draft endpoint URLs when inputs change. */
    readonly handleEndpointChange: (vendor: LLMProvider, value: string) => void
    /** Handler for updating validation failure results for a vendor. */
    readonly handleKeyResultChange: (vendor: LLMProvider, result: KeyValidationFailure | null) => void
    /** Handler for saving all unsaved changes and closing the dialog. */
    readonly handleSave: () => Promise<void>
    /** Handler for updating draft key values when inputs change. */
    readonly handleValueChange: (vendor: LLMProvider, value: string) => void
    /** Current validation failures for active providers. */
    readonly keyFailures: readonly ApiKeyFailure[]
    /** Persists a single API key, and its endpoint URL, to settings store. */
    readonly persistKey: PersistKey
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
    const {mode, systemMode} = useColorScheme()
    const openAIKeyCheckmark = useCheckmarkFade()
    const anthropicKeyCheckmark = useCheckmarkFade()
    const googleCheckmark = useCheckmarkFade()
    const llmRouterCheckmark = useCheckmarkFade()

    const apiKeys = useSettingsStore((state) => state.settings.apiKeys)
    const apiEndpoints = useSettingsStore((state) => state.settings.apiEndpoints)
    const updateSettings = useSettingsStore((state) => state.updateSettings)

    const [keyTestResults, setKeyTestResults] = useState<Partial<Record<LLMProvider, ApiKeyFailure | null>>>({})
    const currentDrafts = useRef<Record<string, string>>({})
    const currentEndpointDrafts = useRef<Record<string, string>>({})
    const savingKeys = useRef(
        new Map<LLMProvider, {endpoint: string; id: symbol; key: string; result: Promise<boolean>}>()
    )
    const [draftKeys, setDraftKeys] = useState<Record<string, string>>({})
    const [draftEndpoints, setDraftEndpoints] = useState<Record<string, string>>({})
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState<boolean>(false)

    useEffect(
        () => () => {
            // Invalidate pending validation so it cannot save a key after this dialog unmounts.
            savingKeys.current.clear()
            currentDrafts.current = {}
            currentEndpointDrafts.current = {}
        },
        []
    )

    const checkmarks = useMemo(
        (): Record<LLMProvider, CheckmarkFade> => ({
            Anthropic: anthropicKeyCheckmark,
            OpenAI: openAIKeyCheckmark,
            Google: googleCheckmark,
            "LLM Router": llmRouterCheckmark,
        }),
        [anthropicKeyCheckmark, googleCheckmark, llmRouterCheckmark, openAIKeyCheckmark]
    )

    const darkMode = isDarkMode(mode ?? theme.palette.mode, systemMode)

    const providerItems: readonly ByokProviderItem[] = useMemo(
        () =>
            PROVIDER_DEFINITIONS.map((def) => ({
                checkmark: checkmarks[def.vendor],
                endpointHelperText: def.endpointHelperText,
                hasEndpoint: hasEndpoint(def.vendor),
                idSuffix: def.idSuffix,
                logo: def.getLogo(darkMode),
                onTest: def.onTest,
                placeholder: def.placeholder,
                vendor: def.vendor,
            })),
        [checkmarks, darkMode]
    )

    const activeConfigs = useMemo(
        () => (supportedProviders ? providerItems.filter((c) => supportedProviders.has(c.vendor)) : providerItems),
        [providerItems, supportedProviders]
    )

    const persistKey: PersistKey = useCallback(
        async (vendor, key, endpoint, checkmark, now, allowUnverified = false) => {
            const id = Symbol("BYOK save")
            const isCurrentDraft = () =>
                currentDrafts.current[vendor] === key &&
                (!hasEndpoint(vendor) || currentEndpointDrafts.current[vendor] === endpoint)
            const save = async (): Promise<boolean> => {
                if (key && !allowUnverified) {
                    const result = await PROVIDER_DEFINITIONS.find((def) => def.vendor === vendor).onTest(key, endpoint)
                    // An edit or discard while testing invalidates this save.
                    if (savingKeys.current.get(vendor)?.id !== id || !isCurrentDraft()) {
                        return false
                    }
                    setKeyTestResults((prev) => ({
                        ...prev,
                        [vendor]: isKeyValidationFailure(result) ? {vendor, result, canSaveUnverified: true} : null,
                    }))
                    if (!result.ok) {
                        return false
                    }
                }
                // Checked after the test, since another save may have finished while this key was being tested
                if (key && getConflictingProvider(vendor, useSettingsStore.getState().settings.apiKeys)) {
                    return false
                }
                updateSettings({
                    apiKeys: {
                        [vendor]: {
                            value: key,
                            expiresAt: key ? now + API_KEYS_TTL_MS : 0,
                        },
                    },
                    // Forgetting a key keeps its endpoint URL, like other settings
                    ...(key && hasEndpoint(vendor) ? {apiEndpoints: {[vendor]: endpoint}} : {}),
                })
                const {[vendor]: _savedDraft, ...remainingDrafts} = currentDrafts.current
                currentDrafts.current = remainingDrafts
                const {[vendor]: _savedEndpoint, ...remainingEndpointDrafts} = currentEndpointDrafts.current
                currentEndpointDrafts.current = remainingEndpointDrafts
                checkmark.trigger()
                setDraftKeys((prev) => {
                    const {[vendor]: _, ...rest} = prev
                    return rest
                })
                setDraftEndpoints((prev) => {
                    const {[vendor]: _, ...rest} = prev
                    return rest
                })
                return true
            }

            if (!key) {
                savingKeys.current.delete(vendor)
                return save()
            }

            const existing = savingKeys.current.get(vendor)
            if (existing?.key === key && existing.endpoint === endpoint) {
                return existing.result
            }

            const canSaveUnverified = keyTestResults[vendor]?.canSaveUnverified && isCurrentDraft()
            if (existing || (allowUnverified && !canSaveUnverified)) {
                return false
            }

            const pending = {endpoint, id, key, result: Promise.resolve().then(save)}
            savingKeys.current.set(vendor, pending)
            try {
                return await pending.result
            } finally {
                if (savingKeys.current.get(vendor) === pending) {
                    savingKeys.current.delete(vendor)
                }
            }
        },
        [keyTestResults, updateSettings]
    )

    const handleValueChange = useCallback((vendor: LLMProvider, value: string) => {
        currentDrafts.current[vendor] = value
        setDraftKeys((prev) => ({...prev, [vendor]: value}))
    }, [])

    const handleEndpointChange = useCallback((vendor: LLMProvider, value: string) => {
        currentEndpointDrafts.current[vendor] = value
        setDraftEndpoints((prev) => ({...prev, [vendor]: value}))
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
                const key = draftKeys[vendor]
                const endpoint = draftEndpoints[vendor]
                const keyChanged = key !== undefined && key !== (getApiKey(apiKeys, vendor) ?? "")
                // An endpoint URL is only saved with a key
                const endpointChanged =
                    hasEndpoint(vendor) &&
                    Boolean(key) &&
                    endpoint !== undefined &&
                    endpoint !== getEndpoint(apiEndpoints, vendor)
                return keyChanged || endpointChanged
            }),
        [activeConfigs, apiEndpoints, apiKeys, draftEndpoints, draftKeys]
    )

    const handleClose = useCallback(() => {
        if (getDirtyDrafts().length > 0) {
            setShowUnsavedChangesModal(true)
        } else {
            onClose?.()
        }
    }, [getDirtyDrafts, onClose])

    const clearDrafts = useCallback(() => {
        savingKeys.current.clear()
        setKeyTestResults({})
        currentDrafts.current = {}
        currentEndpointDrafts.current = {}
        setDraftKeys({})
        setDraftEndpoints({})
        setShowUnsavedChangesModal(false)
    }, [])

    const handleDiscard = useCallback(() => {
        clearDrafts()
        onClose?.()
    }, [clearDrafts, onClose])

    const handleSave = useCallback(async () => {
        const now = Date.now()
        const drafts = getDirtyDrafts().map(({checkmark, vendor}) => ({
            checkmark,
            endpoint: draftEndpoints[vendor] ?? "",
            key: draftKeys[vendor],
            vendor,
        }))
        setShowUnsavedChangesModal(false)
        const saved = await Promise.all(
            drafts.map(({checkmark, endpoint, key, vendor}) => persistKey(vendor, key, endpoint, checkmark, now))
        )
        const {settings} = useSettingsStore.getState()
        const isSaved = (draft: string | undefined, savedValue: string) => draft === undefined || draft === savedValue
        if (
            saved.every(Boolean) &&
            activeConfigs.every(
                ({vendor}) =>
                    isSaved(currentDrafts.current[vendor], getApiKey(settings.apiKeys, vendor) ?? "") &&
                    (!hasEndpoint(vendor) ||
                        !getApiKey(settings.apiKeys, vendor) ||
                        isSaved(currentEndpointDrafts.current[vendor], getEndpoint(settings.apiEndpoints, vendor)))
            )
        ) {
            setDraftKeys({})
            setDraftEndpoints({})
            onClose?.()
        }
    }, [activeConfigs, getDirtyDrafts, draftEndpoints, draftKeys, persistKey, onClose])

    return {
        activeConfigs,
        apiEndpoints,
        apiKeys,
        handleClose,
        clearDrafts,
        handleDiscard,
        handleEndpointChange,
        handleKeyResultChange,
        handleSave,
        handleValueChange,
        keyFailures,
        persistKey,
        showUnsavedChangesModal,
    }
}

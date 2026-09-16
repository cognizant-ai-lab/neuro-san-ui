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

import Box from "@mui/material/Box"
import {useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {FC, useCallback, useMemo, useState} from "react"

import {ApiKeyErrorBanner, ApiKeyFailure} from "./ApiKeyErrorBanner"
import {ApiKeyInput} from "./ApiKeyInput"
import {ByokUnsavedChangesModal} from "./ByokUnsavedChangesModal"
import {useCheckmarkFade} from "./FadingCheckmark"
import {SettingsRow} from "./SettingsRow"
import {
    isAnthropicKeyValid,
    isOpenAIKeyValid,
    KeyValidationFailure,
    KeyValidationResult,
} from "../../controller/llm/Providers"
import {API_KEYS_TTL_MS, getApiKey, LLMProvider, useSettingsStore} from "../../state/Settings"
import {MUIDialog} from "../Common/MUIDialog"

export interface ByokDialogProps {
    /** Base element ID for DOM and testing references. */
    readonly id: string
    /** Whether the dialog is open. */
    readonly isOpen?: boolean
    /** Callback invoked when the dialog is closed. */
    readonly onClose?: () => void
    /** Optional list or set of LLM providers to include. If omitted, all supported providers are shown. */
    readonly supportedProviders?: ReadonlySet<LLMProvider> | readonly LLMProvider[]
}

interface LLMProviderInputConfig {
    checkmark: ReturnType<typeof useCheckmarkFade>
    idSuffix: string
    logo: string
    onTest: (key: string) => Promise<KeyValidationResult>
    placeholder: string
    vendor: LLMProvider
}

/**
 * Dialog for managing Bring Your Own Key (BYOK) API keys.
 * Tracks unsaved key changes and prompts the user with a confirmation modal before closing if unsaved edits exist.
 *
 * @param props Component properties
 * @param props.id Base ID for DOM and test references
 * @param props.isOpen Whether the dialog is visible
 * @param props.onClose Callback invoked when dialog closes
 * @param props.supportedProviders Optional filter for supported providers
 * @return BYOK dialog element
 */
export const ByokDialog: FC<ByokDialogProps> = ({id, isOpen = true, onClose, supportedProviders}) => {
    const theme = useTheme()
    const apiKeys = useSettingsStore((state) => state.settings.apiKeys)
    const updateSettings = useSettingsStore((state) => state.updateSettings)

    const openAIKeyCheckmark = useCheckmarkFade()
    const anthropicKeyCheckmark = useCheckmarkFade()

    const [keyTestResults, setKeyTestResults] = useState<Partial<Record<LLMProvider, ApiKeyFailure | null>>>({})
    const [draftKeys, setDraftKeys] = useState<Partial<Record<LLMProvider, string>>>({})
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState<boolean>(false)

    const apiKeyConfigs: LLMProviderInputConfig[] = useMemo(
        () => [
            {
                checkmark: openAIKeyCheckmark,
                idSuffix: "openai",
                logo: theme.palette.mode === "dark" ? "/OpenAI-white.png" : "/OpenAI-black.png",
                onTest: isOpenAIKeyValid,
                placeholder: "sk-...",
                vendor: "OpenAI",
            },
            {
                checkmark: anthropicKeyCheckmark,
                idSuffix: "anthropic",
                logo: "/claude.png",
                onTest: isAnthropicKeyValid,
                placeholder: "sk-ant-...",
                vendor: "Anthropic",
            },
        ],
        [openAIKeyCheckmark, anthropicKeyCheckmark, theme.palette.mode]
    )

    const activeConfigs = useMemo(() => {
        if (!supportedProviders) {
            return apiKeyConfigs
        }
        const providerSet = supportedProviders instanceof Set ? supportedProviders : new Set(supportedProviders)
        return apiKeyConfigs.filter(({vendor}) => providerSet.has(vendor))
    }, [apiKeyConfigs, supportedProviders])

    const handleKeyResultChange = useCallback((vendor: LLMProvider, result: KeyValidationFailure | null) => {
        setKeyTestResults((prev) => ({
            ...prev,
            [vendor]: result ? {vendor, result} : null,
        }))
    }, [])

    const handleValueChange = useCallback((vendor: LLMProvider, value: string) => {
        setDraftKeys((prev) => ({
            ...prev,
            [vendor]: value,
        }))
    }, [])

    const persistKey = useCallback(
        (vendor: LLMProvider, key: string, checkmark: ReturnType<typeof useCheckmarkFade>, now: number) => {
            updateSettings({
                apiKeys: {
                    [vendor]: {
                        value: key,
                        expiresAt: key ? now + API_KEYS_TTL_MS : 0,
                    },
                },
            })
            setDraftKeys((prev) => ({
                ...prev,
                [vendor]: undefined,
            }))
            checkmark.trigger()
        },
        [updateSettings]
    )

    const hasUnsavedKeys = useMemo(() => {
        return activeConfigs.some(({vendor}) => {
            const draft = draftKeys[vendor]
            if (draft === undefined) {
                return false
            }
            const persisted = getApiKey(apiKeys, vendor) ?? ""
            return draft !== persisted
        })
    }, [activeConfigs, draftKeys, apiKeys])

    const handleClose = () => {
        if (hasUnsavedKeys) {
            setShowUnsavedChangesModal(true)
            return
        }
        onClose?.()
    }

    const handleDiscard = () => {
        setDraftKeys({})
        setShowUnsavedChangesModal(false)
        onClose?.()
    }

    const handleSave = () => {
        const now = Date.now()
        activeConfigs.forEach(({checkmark, vendor}) => {
            const draft = draftKeys[vendor]
            if (draft !== undefined && draft !== (getApiKey(apiKeys, vendor) ?? "")) {
                persistKey(vendor, draft, checkmark, now)
            }
        })
        setDraftKeys({})
        setShowUnsavedChangesModal(false)
        onClose?.()
    }

    const keyFailures: ApiKeyFailure[] = activeConfigs.flatMap(({vendor}) => {
        const failure = keyTestResults[vendor]
        return failure ? [failure] : []
    })

    const titleNode = (
        <Box sx={{display: "flex", alignItems: "center", gap: theme.spacing(1)}}>
            <Typography variant="h6">API Keys</Typography>
            <Tooltip
                title="API keys are stored locally in your browser's memory for the duration of your session only
                and are only sent to the Neuro SAN service for use with the associated LLM provider when you use
                this application to interact with networks.
                Your keys are never sent to any other servers or services and are not stored on our servers.
                When you close this tab or your browser, your keys will be permanently cleared from memory and
                you will need to enter them again to use services that require them."
            >
                <Typography
                    sx={{
                        alignSelf: "flex-start",
                        color: "var(--bs-secondary)",
                        cursor: "help",
                        fontSize: "0.7rem",
                        lineHeight: 1,
                        mt: 0.5,
                    }}
                    variant="caption"
                >
                    <Box
                        component="span"
                        sx={{mr: 0.5}}
                    >
                        ⓘ
                    </Box>
                    <Box
                        component="span"
                        sx={{
                            borderBottom: "1px dashed",
                            pb: 0.25,
                        }}
                    >
                        How are my keys stored and used?
                    </Box>
                </Typography>
            </Tooltip>
        </Box>
    )

    return (
        <>
            {showUnsavedChangesModal ? (
                <ByokUnsavedChangesModal
                    id={id}
                    onDiscard={handleDiscard}
                    onSave={handleSave}
                />
            ) : null}
            <MUIDialog
                id={id}
                isOpen={isOpen}
                onClose={handleClose}
                paperProps={{
                    minWidth: "500px",
                    maxWidth: "700px",
                    border: "1px solid",
                }}
                title={titleNode}
            >
                <ApiKeyErrorBanner
                    failures={keyFailures}
                    id={`${id}-api-key-error-banner`}
                />
                <Box sx={{display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, mt: 1}}>
                    {activeConfigs.map(({checkmark, vendor, idSuffix, logo, onTest, placeholder}) => (
                        <SettingsRow
                            checkmark={checkmark}
                            key={`${id}-${idSuffix}`}
                            label=""
                            tooltip={`API key for ${vendor}.`}
                        >
                            <ApiKeyInput
                                forgetKey={() => persistKey(vendor, "", checkmark, 0)}
                                id={`${id}-${idSuffix}`}
                                logo={logo}
                                onResultChange={handleKeyResultChange}
                                onSave={(key) => persistKey(vendor, key, checkmark, Date.now())}
                                onTest={onTest}
                                onValueChange={handleValueChange}
                                persistedValue={getApiKey(apiKeys, vendor)}
                                placeholder={placeholder}
                                vendor={vendor}
                            />
                        </SettingsRow>
                    ))}
                </Box>
            </MUIDialog>
        </>
    )
}

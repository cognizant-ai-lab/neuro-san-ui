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
import {FC} from "react"

import {ApiEndpointsMap, ApiKeysMap, ByokProviderItem, PersistKey} from "./useByokKeyManager"
import {KeyValidationFailure} from "../../../controller/llm/Providers"
import {getApiKey, LLMProvider} from "../../../state/Settings"
import {ApiKeyErrorBanner, ApiKeyFailure} from "../ApiKeyErrorBanner"
import {ApiKeyInput} from "../ApiKeyInput"
import {SettingsRow} from "../SettingsRow"

export interface ByokInputsProps {
    /** Persisted endpoint URLs to display in inputs. */
    readonly apiEndpoints: ApiEndpointsMap
    /** Persisted API keys map to display in inputs. */
    readonly apiKeys: ApiKeysMap | undefined
    /** Active provider input configurations. */
    readonly configs: readonly ByokProviderItem[]
    /** Base ID for DOM and testing references. */
    readonly id: string
    /** Current test failures to display in error banner. */
    readonly keyFailures: readonly ApiKeyFailure[]
    /** Callback when an endpoint URL input value changes. */
    readonly onEndpointChange: (vendor: LLMProvider, value: string) => void
    /** Callback when a key validation test produces a result. */
    readonly onKeyResultChange: (vendor: LLMProvider, result: KeyValidationFailure | null) => void
    /** Callback to persist an API key. */
    readonly onPersistKey: PersistKey
    /** Callback when an input value changes. */
    readonly onValueChange: (vendor: LLMProvider, value: string) => void
}

/**
 * Presentational component rendering the list of BYOK API key inputs and error banner.
 *
 * @param props Component properties
 * @param props.apiEndpoints Persisted endpoint URLs
 * @param props.apiKeys Persisted API keys map
 * @param props.configs Provider configurations to render
 * @param props.id Base ID for DOM references
 * @param props.keyFailures Active key validation failures
 * @param props.onEndpointChange Handler when endpoint URL input text changes
 * @param props.onKeyResultChange Handler when key test result is obtained
 * @param props.onPersistKey Handler to save or clear an API key
 * @param props.onValueChange Handler when key input draft text changes
 * @return Rendered BYOK inputs list with error banner
 */
export const ByokInputs: FC<ByokInputsProps> = ({
    apiEndpoints,
    apiKeys,
    configs,
    id,
    keyFailures,
    onEndpointChange,
    onKeyResultChange,
    onPersistKey,
    onValueChange,
}) => (
    <>
        <ApiKeyErrorBanner
            failures={keyFailures}
            id={`${id}-api-key-error-banner`}
        />
        <Box sx={{display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, mt: 1, width: "100%"}}>
            {configs.map(
                ({checkmark, endpointPlaceholder, hasEndpoint, idSuffix, logo, onTest, placeholder, vendor}) => (
                    <SettingsRow
                        checkmark={checkmark}
                        key={`${id}-${idSuffix}`}
                        label=""
                        tooltip={`API key for ${vendor}.`}
                    >
                        <ApiKeyInput
                            endpointPlaceholder={endpointPlaceholder}
                            forgetKey={() => onPersistKey(vendor, "", "", checkmark, 0)}
                            id={`${id}-${idSuffix}`}
                            logo={logo}
                            onEndpointChange={onEndpointChange}
                            onResultChange={onKeyResultChange}
                            onSaveUnverified={
                                keyFailures.some((failure) => failure.vendor === vendor && failure.canSaveUnverified)
                                    ? (key, endpoint) =>
                                          onPersistKey(vendor, key, endpoint, checkmark, Date.now(), true)
                                    : undefined
                            }
                            onSave={(key, endpoint) => onPersistKey(vendor, key, endpoint, checkmark, Date.now())}
                            onTest={onTest}
                            onValueChange={onValueChange}
                            persistedEndpoint={hasEndpoint ? (apiEndpoints[vendor] ?? "") : undefined}
                            persistedValue={getApiKey(apiKeys, vendor)}
                            placeholder={placeholder}
                            vendor={vendor}
                        />
                    </SettingsRow>
                )
            )}
        </Box>
    </>
)

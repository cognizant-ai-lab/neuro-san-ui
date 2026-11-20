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
import Typography from "@mui/material/Typography"
import {FC} from "react"

import {ByokInputs} from "./ByokInputs"
import {ByokStorageTooltip} from "./ByokStorageTooltip"
import {ByokUnsavedChangesModal} from "./ByokUnsavedChangesModal"
import {useByokKeyManager} from "./useByokKeyManager"
import {LLMProvider} from "../../../state/Settings"
import {MUIDialog} from "../../Common/MUIDialog"

export interface ByokDialogProps {
    /** Base ID for DOM and test references. */
    readonly id: string
    /** Whether the dialog is open. Defaults to true. */
    readonly isOpen?: boolean
    /** Callback invoked when the dialog closes. */
    readonly onClose?: () => void
    /** Optional filter for supported providers. */
    readonly supportedProviders?: ReadonlySet<LLMProvider>
}

/**
 * Dialog for managing Bring Your Own Key (BYOK) API keys.
 * Prompts the user with a confirmation modal before closing if unsaved edits exist.
 *
 * @param props Component properties
 * @param props.id Base ID for DOM and test references
 * @param props.isOpen Whether the dialog is visible
 * @param props.onClose Callback invoked when dialog closes
 * @param props.supportedProviders Optional filter for supported providers
 * @return BYOK dialog element
 */
export const ByokDialog: FC<ByokDialogProps> = ({id, isOpen = true, onClose, supportedProviders}) => {
    const {
        activeConfigs,
        apiEndpoints,
        apiKeys,
        handleClose,
        handleDiscard,
        handleEndpointChange,
        handleKeyResultChange,
        handleSave,
        handleValueChange,
        keyFailures,
        persistKey,
        showUnsavedChangesModal,
    } = useByokKeyManager({onClose, supportedProviders})

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
                title={
                    <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                        <Typography variant="h6">API Keys</Typography>
                        <ByokStorageTooltip />
                    </Box>
                }
            >
                <ByokInputs
                    apiEndpoints={apiEndpoints}
                    apiKeys={apiKeys}
                    configs={activeConfigs}
                    id={id}
                    keyFailures={keyFailures}
                    onEndpointChange={handleEndpointChange}
                    onKeyResultChange={handleKeyResultChange}
                    onPersistKey={persistKey}
                    onValueChange={handleValueChange}
                />
            </MUIDialog>
        </>
    )
}

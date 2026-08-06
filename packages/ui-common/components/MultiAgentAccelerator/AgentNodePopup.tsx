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

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import TextField from "@mui/material/TextField"
import {Dispatch, FC, SetStateAction, useEffect, useRef, useState} from "react"

import {AgentNetworkDefinitionEntry} from "./const"
import {useTempNetworksStore} from "../../state/TemporaryNetworks"
import {ConfirmationModal} from "../Common/ConfirmationModal"
import {MUIDialog} from "../Common/MUIDialog"
import {NotificationType, sendNotification} from "../Common/notification"

//#region: Types

export interface AgentNodePopupProps {
    readonly agentId: string

    /** The agent's display name — shown read-only in the dialog header area. */
    readonly agentName: string

    /** Whether the dialog is open. */
    readonly isOpen: boolean

    /** Initial instructions text shown in the editable field. Defaults to an empty string. */
    readonly initialInstructions?: string

    /** Initial description text shown in the editable field. Defaults to an empty string. */
    readonly initialDescription?: string

    readonly networkId: string

    readonly onSaveAgent: (
        agentName: string,
        updated: AgentNetworkDefinitionEntry[],
        agentNetworkName: string | undefined,
        signal: AbortSignal
    ) => Promise<void>

    readonly setIsPopupOpen: Dispatch<SetStateAction<boolean>>
}

//#endregion: Types

//#region: Constants

const AGENT_SAVE_TIMEOUT_MS = 60_000

//#endregion: Constants

/**
 * A popup dialog for viewing and editing an agent node's instructions and description.
 *
 * - Agent name is displayed read-only in the dialog header.
 * - Both instructions and description are editable.
 * - Saving is a no-op until the API endpoint is wired up; `onSave` receives the current values.
 */
export const AgentNodePopup: FC<AgentNodePopupProps> = ({
    agentId,
    agentName,
    initialDescription = "",
    initialInstructions = "",
    isOpen,
    networkId,
    onSaveAgent,
    setIsPopupOpen,
}) => {
    const [instructionsText, setInstructionsText] = useState<string>(initialInstructions)
    const [descriptionText, setDescriptionText] = useState<string>(initialDescription)

    const isDirty = instructionsText !== initialInstructions || descriptionText !== initialDescription

    // True, while the agent-edit request is in-flight so we can disable the Save button.
    const [isSavingAgent, setIsSavingAgent] = useState<boolean>(false)

    // AbortController for the in-flight save request — stored in a ref so handlePopupClose can cancel it.
    const saveAbortControllerRef = useRef<AbortController | null>(null)

    const [displayConfirmationModal, setDisplayConfirmationModal] = useState<boolean>(false)

    const tempNetworks = useTempNetworksStore((state) => state.tempNetworks)
    const updateTempNetworkDefinition = useTempNetworksStore((state) => state.updateTempNetworkDefinition)

    // Keep local fields in sync when the dialog opens or if initial values change while open.
    // Guarding on isOpen prevents resetting the text during the close animation, which would cause a visible flash.
    useEffect(() => {
        if (isOpen) {
            setInstructionsText(initialInstructions)
            setDescriptionText(initialDescription)
        }
    }, [initialInstructions, initialDescription, isOpen])

    const onSave = async () => {
        if (!agentId) return

        // Find the temp network entry for the currently selected network.
        const currentTempNetwork = networkId
            ? tempNetworks.find((n) => n.agentInfo.agent_name === networkId)
            : undefined

        // Produce a new array with the saved agent's fields updated; all other entries pass through unchanged.
        const currentDefinitions = currentTempNetwork?.agentNetworkDefinition ?? []
        const updatedDefinitions = currentDefinitions.map((entry) =>
            entry.origin === agentId ? {...entry, instructions: instructionsText, description: descriptionText} : entry
        )
        if (networkId) {
            updateTempNetworkDefinition(networkId, updatedDefinitions)
        }

        setIsSavingAgent(true)
        const saveController = new AbortController()
        saveAbortControllerRef.current = saveController
        const saveTimeoutId = setTimeout(
            () => saveController.abort(new DOMException("Save timed out", "TimeoutError")),
            AGENT_SAVE_TIMEOUT_MS
        )
        try {
            await onSaveAgent(
                agentName,
                updatedDefinitions,
                currentTempNetwork?.agentNetworkName,
                saveController.signal
            )
        } catch (e) {
            console.error(`Error saving network ${agentName}. See onSaveAgent implementation for details.`, e)
            sendNotification(
                NotificationType.error,
                `Failed to save agent "${agentName}".`,
                String(e),
                undefined,
                null // show indefinitely until the user dismisses
            )
        } finally {
            clearTimeout(saveTimeoutId)
            saveAbortControllerRef.current = null
            setIsSavingAgent(false)
            setIsPopupOpen(false)
        }
    }

    const handleClose = () => {
        if (isSavingAgent) {
            return
        }

        if (isDirty) {
            setDisplayConfirmationModal(true)
            return
        }

        setInstructionsText(initialInstructions)
        setDescriptionText(initialDescription)
        // If a save is in-flight, abort it immediately so the stream doesn't hang.
        saveAbortControllerRef.current?.abort()
        saveAbortControllerRef.current = null

        setIsPopupOpen(false)
        setIsSavingAgent(false)
    }

    const footer = (
        <Box
            sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                width: "100%",
                gap: 1,
            }}
        >
            <Box sx={{display: "flex", gap: 1}}>
                <Button
                    id="agent-node-popup-cancel-btn"
                    onClick={handleClose}
                    variant="outlined"
                    size="small"
                    disabled={isSavingAgent}
                >
                    Cancel
                </Button>
                <Button
                    id="agent-node-popup-save-btn"
                    onClick={onSave}
                    variant="contained"
                    size="small"
                    disabled={isSavingAgent || !isDirty}
                    startIcon={
                        isSavingAgent ? (
                            <CircularProgress
                                size={14}
                                color="inherit"
                            />
                        ) : undefined
                    }
                >
                    {isSavingAgent ? "Applying changes..." : "Save"}
                </Button>
            </Box>
        </Box>
    )

    const getConfirmationModal = () => (
        <ConfirmationModal
            id="agent-node-popup-unsaved-changes-modal"
            cancelBtnLabel="Discard changes"
            closeable={false}
            content={<p>You have unsaved edits. Are you sure you want to discard your changes and close the dialog?</p>}
            handleCancel={() => {
                setDisplayConfirmationModal(false)
                setInstructionsText(initialInstructions)
                setDescriptionText(initialDescription)
                handleClose()
            }}
            handleOk={onSave}
            maskCloseable={false}
            okBtnLabel="Save changes"
            title="Unsaved Changes"
        />
    )

    const getEditPopup = () => (
        <MUIDialog
            footer={footer}
            id="agent-node-popup"
            isOpen={isOpen}
            onClose={handleClose}
            paperProps={{minWidth: "480px", maxWidth: "600px", width: "100%"}}
            title={agentName}
        >
            {/* Description — editable */}
            <TextField
                disabled={isSavingAgent}
                fullWidth
                id="agent-node-popup-description-field"
                label="Description"
                multiline
                onChange={(e) => setDescriptionText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key !== "Escape") e.stopPropagation()
                }}
                placeholder="Enter a short description of this agent…"
                rows={6}
                slotProps={{htmlInput: {style: {fontSize: "0.85rem"}}}}
                size="small"
                value={descriptionText}
            />
            {/* Instructions — editable */}
            <TextField
                autoFocus
                disabled={isSavingAgent}
                fullWidth
                id="agent-node-popup-instructions-field"
                label="Instructions"
                multiline
                onChange={(e) => setInstructionsText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key !== "Escape") e.stopPropagation()
                }}
                placeholder="Enter instructions for this agent…"
                rows={6}
                slotProps={{htmlInput: {style: {fontSize: "0.85rem"}}}}
                size="small"
                sx={{marginTop: 2}}
                value={instructionsText}
            />
        </MUIDialog>
    )

    return (
        <>
            {displayConfirmationModal && getConfirmationModal()}
            {getEditPopup()}
        </>
    )
}

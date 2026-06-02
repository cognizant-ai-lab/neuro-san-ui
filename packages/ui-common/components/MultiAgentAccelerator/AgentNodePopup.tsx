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
import {useTheme} from "@mui/material/styles"
import TextField from "@mui/material/TextField"
import {FC, useEffect, useState} from "react"

import {getDarkModeOutlinedButtonSx} from "../../Theme/Theme"
import {ConfirmationModal} from "../Common/ConfirmationModal"
import {MUIDialog} from "../Common/MUIDialog"

// #region: Types

export interface AgentNodePopupProps {
    /** The agent's display name — shown read-only in the dialog header area. */
    readonly agentName: string
    /** Whether the dialog is open. */
    readonly isOpen: boolean
    /** Called when the user closes or cancels the dialog without saving. */
    readonly onClose: () => void
    /**
     * Called when the user saves the edited fields.
     * @param agentName The agent's name (unchanged).
     * @param instructions The updated instructions text.
     * @param description The updated description text.
     */
    readonly onSave: (agentName: string, instructions: string, description: string) => void
    /** Initial instructions text shown in the editable field. Defaults to an empty string. */
    readonly initialInstructions?: string
    /** Initial description text shown in the editable field. Defaults to an empty string. */
    readonly initialDescription?: string
    /** When true the save API call is in-flight; shows an "Applying changes..." button and disables both actions. */
    readonly isSaving?: boolean
}

// #endregion: Types

/**
 * A popup dialog for viewing and editing an agent node's instructions and description.
 *
 * - Agent name is displayed read-only in the dialog header.
 * - Both instructions and description are editable.
 * - Saving is a no-op until the API endpoint is wired up; `onSave` receives the current values.
 */
export const AgentNodePopup: FC<AgentNodePopupProps> = ({
    agentName,
    isOpen,
    onClose,
    onSave,
    initialInstructions = "",
    initialDescription = "",
    isSaving = false,
}) => {
    const [instructionsText, setInstructionsText] = useState<string>(initialInstructions)
    const [descriptionText, setDescriptionText] = useState<string>(initialDescription)
    const theme = useTheme()

    const isDirty = instructionsText !== initialInstructions || descriptionText !== initialDescription

    const [displayConfirmationModal, setDisplayConfirmationModal] = useState<boolean>(false)

    // Keep local fields in sync when the dialog opens or if initial values change while open.
    // Guarding on isOpen prevents resetting the text during the close animation, which would cause a visible flash.
    useEffect(() => {
        if (isOpen) {
            setInstructionsText(initialInstructions)
            setDescriptionText(initialDescription)
        }
    }, [initialInstructions, initialDescription, isOpen])

    const handleSave = () => {
        onSave(agentName, instructionsText, descriptionText)
    }

    const handleClose = () => {
        if (isSaving) {
            return
        }

        if (isDirty) {
            setDisplayConfirmationModal(true)
            return
        }

        setInstructionsText(initialInstructions)
        setDescriptionText(initialDescription)
        onClose()
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
                    disabled={isSaving}
                    sx={getDarkModeOutlinedButtonSx(theme)}
                >
                    Cancel
                </Button>
                <Button
                    id="agent-node-popup-save-btn"
                    onClick={handleSave}
                    variant="contained"
                    size="small"
                    disabled={isSaving || !isDirty}
                    startIcon={
                        isSaving ? (
                            <CircularProgress
                                size={14}
                                color="inherit"
                            />
                        ) : undefined
                    }
                >
                    {isSaving ? "Applying changes..." : "Save"}
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
                onClose()
            }}
            handleOk={handleSave}
            maskCloseable={false}
            okBtnLabel="Save changes"
            title="Unsaved Changes"
        />
    )

    return (
        <>
            {displayConfirmationModal && getConfirmationModal()}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
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
        </>
    )
}

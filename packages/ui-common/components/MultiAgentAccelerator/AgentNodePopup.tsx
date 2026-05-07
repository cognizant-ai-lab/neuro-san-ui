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
import LinearProgress from "@mui/material/LinearProgress"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import {FC, useEffect, useState} from "react"

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
    /**
     * When true the dialog is in a saving state: the Save button is disabled and shows a spinner.
     * Defaults to false.
     */
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
        // Discard local edits and reset to the initial values on cancel
        setInstructionsText(initialInstructions)
        setDescriptionText(initialDescription)
        onClose()
    }

    // Passed to MUIDialog's onClose to handle both backdrop click and Escape key.
    // Always dismissable — if the save is in-flight the finally block will clean up state.
    // This is necessary since the API request doesn't always close successfully.
    const handleDialogClose = () => {
        handleClose()
    }

    const footer = (
        <Box
            sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                width: "100%",
                gap: 1,
            }}
        >
            {isSaving ? (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{fontStyle: "italic", lineHeight: 1.35, marginLeft: "0.75rem"}}
                >
                    Creating a new network with those changes.
                </Typography>
            ) : (
                <Box />
            )}
            <Box sx={{display: "flex", gap: 1}}>
                <Button
                    id="agent-node-popup-cancel-btn"
                    onClick={handleClose}
                    variant="outlined"
                    size="small"
                    disabled={isSaving}
                >
                    Cancel
                </Button>
                <Button
                    id="agent-node-popup-save-btn"
                    onClick={handleSave}
                    variant="contained"
                    size="small"
                    disabled={isSaving}
                    startIcon={
                        isSaving ? (
                            <CircularProgress
                                size={14}
                                color="inherit"
                            />
                        ) : undefined
                    }
                >
                    {isSaving ? "Saving…" : "Save"}
                </Button>
            </Box>
        </Box>
    )

    return (
        <MUIDialog
            id="agent-node-popup"
            isOpen={isOpen}
            onClose={handleDialogClose}
            title={agentName}
            footer={footer}
            paperProps={{minWidth: "480px", maxWidth: "600px", width: "100%"}}
        >
            {/* Progress bar shown while saving — makes it clear the dialog is busy */}
            {isSaving && (
                <LinearProgress
                    aria-label="Saving agent"
                    sx={{mb: 2, borderRadius: 1}}
                />
            )}
            {/* Description — editable */}
            <TextField
                id="agent-node-popup-description-field"
                label="Description"
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                multiline
                rows={6}
                fullWidth
                size="small"
                disabled={isSaving}
                placeholder="Enter a short description of this agent…"
            />
            {/* Instructions — editable */}
            <TextField
                sx={{marginTop: 2}}
                id="agent-node-popup-instructions-field"
                label="Instructions"
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                multiline
                rows={6}
                fullWidth
                size="small"
                autoFocus
                disabled={isSaving}
                placeholder="Enter instructions for this agent…"
            />
        </MUIDialog>
    )
}

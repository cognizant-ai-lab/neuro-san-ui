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

import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
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
     * Called when the user saves the edited prompt.
     * @param agentName The agent's name (unchanged).
     * @param prompt The updated prompt text.
     */
    readonly onSave: (agentName: string, prompt: string) => void
    /** Initial prompt text shown in the editable field. Defaults to an empty string. */
    readonly initialPrompt?: string
}

// #endregion: Types

/**
 * A popup dialog for viewing and editing an agent node's system prompt / instructions.
 *
 * - Agent name is displayed read-only.
 * - The system prompt is editable.
 * - Saving is a no-op until the API endpoint is wired up; `onSave` receives the current values.
 */
export const AgentNodePopup: FC<AgentNodePopupProps> = ({agentName, isOpen, onClose, onSave, initialPrompt = ""}) => {
    const [promptText, setPromptText] = useState<string>(initialPrompt)

    // Keep local prompt in sync if initialPrompt changes (e.g. when the API loads it later).
    useEffect(() => {
        setPromptText(initialPrompt)
    }, [initialPrompt, isOpen])

    const handleSave = () => {
        onSave(agentName, promptText)
    }

    const handleClose = () => {
        // Discard local edits and reset to the initial value on cancel
        setPromptText(initialPrompt)
        onClose()
    }

    const footer = (
        <>
            <Button
                id="agent-node-popup-cancel-btn"
                onClick={handleClose}
                variant="outlined"
                size="small"
            >
                Cancel
            </Button>
            <Button
                id="agent-node-popup-save-btn"
                onClick={handleSave}
                variant="contained"
                size="small"
            >
                Save Prompt
            </Button>
        </>
    )

    return (
        <MUIDialog
            id="agent-node-popup"
            isOpen={isOpen}
            onClose={handleClose}
            title={agentName}
            footer={footer}
            paperProps={{minWidth: "480px", maxWidth: "600px", width: "100%"}}
        >
            {/* System prompt — editable */}
            <TextField
                id="agent-node-popup-prompt-field"
                label="System Prompt"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                multiline
                rows={8}
                fullWidth
                size="small"
                autoFocus
                placeholder="Enter system prompt / instructions for this agent…"
            />
        </MUIDialog>
    )
}

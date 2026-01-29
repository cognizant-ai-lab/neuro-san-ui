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

import DeleteOutline from "@mui/icons-material/DeleteOutline"
import Loop from "@mui/icons-material/Loop"
import StopCircle from "@mui/icons-material/StopCircle"
import {FC} from "react"

import {SmallLlmChatButton} from "./LlmChatButton"

// #region: Types
interface ControlButtonsProps {
    clearChatOnClickCallback: () => void
    enableClearChatButton: boolean
    isAwaitingLlm: boolean
    handleSend: (query: string) => void
    handleStop: () => void
    previousUserQuery: string
    shouldEnableRegenerateButton: boolean
}
// #endregion: Types

/**
 * Generate the Control Buttons for a chat window.
 * @returns A fragment containing the Control Buttons.
 */
export const ControlButtons: FC<ControlButtonsProps> = ({
    clearChatOnClickCallback,
    enableClearChatButton,
    isAwaitingLlm,
    handleSend,
    handleStop,
    previousUserQuery,
    shouldEnableRegenerateButton,
}) => (
    <>
        {/*Clear Chat button*/}
        {!isAwaitingLlm && (
            <SmallLlmChatButton
                aria-label="Clear Chat"
                disabled={!enableClearChatButton}
                id="clear-chat-button"
                onClick={clearChatOnClickCallback}
                posBottom={8}
                posRight={65}
            >
                <DeleteOutline
                    fontSize="small"
                    id="stop-button-icon"
                    sx={{color: "var(--bs-white)"}}
                />
            </SmallLlmChatButton>
        )}

        {/*Stop Button*/}
        {isAwaitingLlm && (
            <SmallLlmChatButton
                aria-label="Stop"
                disabled={!isAwaitingLlm}
                id="stop-output-button"
                onClick={() => handleStop()}
                posBottom={8}
                posRight={23}
            >
                <StopCircle
                    fontSize="small"
                    id="stop-button-icon"
                    sx={{color: "var(--bs-white)"}}
                />
            </SmallLlmChatButton>
        )}

        {/*Regenerate Button*/}
        {!isAwaitingLlm && (
            <SmallLlmChatButton
                aria-label="Regenerate"
                disabled={!shouldEnableRegenerateButton}
                id="regenerate-output-button"
                onClick={() => handleSend(previousUserQuery)}
                posBottom={8}
                posRight={23}
            >
                <Loop
                    fontSize="small"
                    id="generate-icon"
                    sx={{color: "var(--bs-white)"}}
                />
            </SmallLlmChatButton>
        )}
    </>
)

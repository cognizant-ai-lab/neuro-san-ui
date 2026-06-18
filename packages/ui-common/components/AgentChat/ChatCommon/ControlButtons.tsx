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

import DeleteOutlined from "@mui/icons-material/DeleteOutlined"
import Loop from "@mui/icons-material/Loop"
import StopCircle from "@mui/icons-material/StopCircle"
import Box from "@mui/material/Box"
import {FC} from "react"

import {SmallLlmChatButton} from "../Common/LlmChatButton"

//#region: Types
interface ControlButtonsProps {
    handleClearChat: () => void
    enableClearChatButton: boolean
    isAwaitingLlm: boolean
    handleSend: (query: string) => void
    handleStop: () => void
    previousUserQuery: string
    shouldEnableRegenerateButton: boolean
}
//#endregion: Types

/**
 * Generate the Control Buttons for a chat window (resend, clear chat, stop)
 * @returns A fragment containing the Control Buttons.
 */
export const ControlButtons: FC<ControlButtonsProps> = ({
    handleClearChat,
    enableClearChatButton,
    isAwaitingLlm,
    handleSend,
    handleStop,
    previousUserQuery,
    shouldEnableRegenerateButton,
}) => (
    <>
        {isAwaitingLlm ? (
            // Stop Button
            <SmallLlmChatButton
                aria-label="Stop"
                disabled={!isAwaitingLlm}
                id="stop-output-button"
                onClick={() => handleStop()}
            >
                <StopCircle
                    fontSize="small"
                    id="stop-button-icon"
                />
            </SmallLlmChatButton>
        ) : (
            <Box sx={{display: "flex", gap: 1}}>
                {/*Clear Chat button*/}
                <SmallLlmChatButton
                    aria-label="Clear Chat"
                    disabled={!enableClearChatButton}
                    id="clear-chat-button"
                    onClick={handleClearChat}
                >
                    <DeleteOutlined
                        fontSize="small"
                        id="stop-button-icon"
                    />
                </SmallLlmChatButton>

                {/*Regenerate Button*/}
                <SmallLlmChatButton
                    aria-label="Regenerate"
                    disabled={!shouldEnableRegenerateButton}
                    id="regenerate-output-button"
                    onClick={() => handleSend(previousUserQuery)}
                >
                    <Loop
                        fontSize="small"
                        id="generate-icon"
                    />
                </SmallLlmChatButton>
            </Box>
        )}
    </>
)

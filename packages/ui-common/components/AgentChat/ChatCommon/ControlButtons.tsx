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
import SaveIcon from "@mui/icons-material/Save"
import StopCircle from "@mui/icons-material/StopCircle"
import Box from "@mui/material/Box"
import {Theme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import {FC} from "react"

import {getSheen, glassSurface, SHEEN_EASE, spinningBorder} from "../../../Theme/sheen"
import {SmallLlmChatButton} from "../Common/LlmChatButton"

// Diameter of the stop button
const STOP_BUTTON_SIZE = 34

/**
 * Stop button: glass disc ringed by the rotating iridescent border (the request is "live"), with an error-colored
 * icon and halo on hover so it reads clearly as "cancel".
 */
const stopButtonSx = (theme: Theme) => {
    const errorMain = (theme.vars ?? theme).palette.error.main
    return {
        ...glassSurface(theme, STOP_BUTTON_SIZE / 2),
        ...spinningBorder(theme, STOP_BUTTON_SIZE / 2, 1.5),
        border: "none",
        borderRadius: "50%",
        boxShadow: `inset 0 1px 0 ${getSheen(theme).highlight}, 0 0 24px -6px ${getSheen(theme).glow}`,
        color: "error.main",
        height: STOP_BUTTON_SIZE,
        transition: `box-shadow 0.3s ${SHEEN_EASE}, transform 0.3s ${SHEEN_EASE}`,
        width: STOP_BUTTON_SIZE,
        "&:hover": {
            backgroundColor: getSheen(theme).glassBg,
            boxShadow: `0 0 0 4px color-mix(in srgb, ${errorMain} 18%, transparent), 0 0 28px -4px ${errorMain}`,
            transform: "scale(1.06)",
        },
    }
}

//#region: Types
interface ControlButtonsProps {
    enableClearChatButton: boolean
    enableSaveChatButton: boolean
    handleClearChat: () => void
    handleSave: () => void
    handleSend: (query: string) => void
    handleStop: () => void
    isAwaitingLlm: boolean
    previousUserQuery: string
    shouldEnableRegenerateButton: boolean
}
//#endregion: Types

/**
 * Generate the Control Buttons for a chat window (resend, clear chat, stop)
 * @returns A fragment containing the Control Buttons.
 */
export const ControlButtons: FC<ControlButtonsProps> = ({
    enableClearChatButton,
    enableSaveChatButton,
    handleClearChat,
    handleSave,
    handleSend,
    handleStop,
    isAwaitingLlm,
    previousUserQuery,
    shouldEnableRegenerateButton,
}) => (
    <>
        {isAwaitingLlm ? (
            // Stop Button
            <Tooltip title="Terminate request">
                <SmallLlmChatButton
                    aria-label="Stop"
                    disabled={!isAwaitingLlm}
                    id="stop-output-button"
                    onClick={() => handleStop()}
                    sx={stopButtonSx}
                >
                    <StopCircle
                        fontSize="small"
                        id="stop-button-icon"
                    />
                </SmallLlmChatButton>
            </Tooltip>
        ) : (
            <Box sx={{display: "flex", gap: 1}}>
                {/*Save Chat button*/}
                <Tooltip title="Save Chat">
                    <span>
                        <SmallLlmChatButton
                            aria-label="Save Chat"
                            disabled={!enableSaveChatButton}
                            id="save-chat-button"
                            onClick={handleSave}
                        >
                            <SaveIcon
                                fontSize="small"
                                id="save-button-icon"
                            />
                        </SmallLlmChatButton>
                    </span>
                </Tooltip>

                {/*Clear Chat button*/}
                <Tooltip title="Clear Chat">
                    <span>
                        <SmallLlmChatButton
                            aria-label="Clear Chat"
                            disabled={!enableClearChatButton}
                            id="clear-chat-button"
                            onClick={handleClearChat}
                        >
                            <DeleteOutlined
                                fontSize="small"
                                id="stop-button-icon"
                                sx={{
                                    "&:hover": {
                                        color: "error.main",
                                    },
                                }}
                            />
                        </SmallLlmChatButton>
                    </span>
                </Tooltip>

                {/*Regenerate Button*/}
                <Tooltip title="Resend last query">
                    <span>
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
                    </span>
                </Tooltip>
            </Box>
        )}
    </>
)

import {DeleteOutline, Loop, StopCircle} from "@mui/icons-material"
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

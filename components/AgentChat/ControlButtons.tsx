import {DeleteOutline, Loop, StopCircle} from "@mui/icons-material"
import {styled} from "@mui/material"

import {LlmChatButton} from "./LlmChatButton"

// #region: Types
interface ControlButtonsProps {
    clearChatOnClickCallback: () => void
    enableClearChatButton: boolean
    isAwaitingLlm: boolean
    handleSend: (query: string) => void
    handleStop: () => void
    previousUserQuery: string
    repositionStopBtnWhileAwaitingLlm?: boolean
    shouldEnableRegenerateButton: boolean
}
// #endregion: Types

// #region: Styled Components
const SmallLlmChatButton = styled(LlmChatButton)({
    minWidth: 0,
    padding: "0.25rem",
})
// #endregion: Styled Components

/**
 * Generate the Control Buttons for a chat window.
 * @returns A fragment containing the Control Buttons.
 */
export const ControlButtons: React.FC<ControlButtonsProps> = ({
    clearChatOnClickCallback,
    enableClearChatButton,
    isAwaitingLlm,
    handleSend,
    handleStop,
    previousUserQuery,
    repositionStopBtnWhileAwaitingLlm = false,
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
                // Custom bottom and right position values when awaiting LLM response for MAA UI (should revise for
                // other chat implementations)
                posBottom={repositionStopBtnWhileAwaitingLlm && isAwaitingLlm ? 0 : 8}
                posRight={repositionStopBtnWhileAwaitingLlm && isAwaitingLlm ? 0 : 23}
                // Set visibility to "visible" when awaiting LLM response to show the Stop button
                sx={{visibility: repositionStopBtnWhileAwaitingLlm && isAwaitingLlm ? "visible" : "none"}}
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

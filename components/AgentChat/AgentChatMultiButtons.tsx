import {DeleteOutline, Loop, StopCircle} from "@mui/icons-material"
import {styled} from "@mui/material"

import {LlmChatButton} from "../internal/LlmChatButton"

// #region: Types
interface AgentChatMultiButtonsProps {
    clearChatOnClickCallback: () => void
    enableClearChatButton: boolean
    isAwaitingLlm: boolean
    handleSend: (query: string) => void
    handleStop: () => void
    previousUserQuery: string
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
 * Generate the agent buttons for the Opportunity Finder agents.
 * @returns A div containing the agent buttons
 */
export const AgentChatMultiButtons: React.FC<AgentChatMultiButtonsProps> = ({
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
                posBottom={15}
                posRight={60}
            >
                <DeleteOutline
                    fontSize="small"
                    id="stop-button-icon"
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
                posBottom={15}
                posRight={15}
            >
                <StopCircle
                    fontSize="small"
                    id="stop-button-icon"
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
                posBottom={15}
                posRight={15}
            >
                <Loop
                    fontSize="small"
                    id="generate-icon"
                />
            </SmallLlmChatButton>
        )}
    </>
)

import {DeleteOutline, Loop, StopCircle} from "@mui/icons-material"
import {styled} from "@mui/material"

import {LlmChatButton} from "../internal/LlmChatButton"

// #region: Types
interface AgentButtonsProps {
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
export const AgentChatButtons: React.FC<AgentButtonsProps> = ({
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
                disabled={!enableClearChatButton}
                id="clear-chat-button"
                onClick={clearChatOnClickCallback}
                posRight={55}
            >
                <DeleteOutline fontSize="small" id="stop-button-icon" />
            </SmallLlmChatButton>
        )}

        {/*Stop Button*/}
        {isAwaitingLlm && (
            <SmallLlmChatButton
                disabled={!isAwaitingLlm}
                id="stop-output-button"
                onClick={() => handleStop()}
            >
                <StopCircle fontSize="small" id="stop-button-icon" />
            </SmallLlmChatButton>
        )}

        {/*Regenerate Button*/}
        {!isAwaitingLlm && (
            <SmallLlmChatButton
                disabled={!shouldEnableRegenerateButton}
                id="regenerate-output-button"
                onClick={() => handleSend(previousUserQuery)}
            >
                <Loop fontSize="small" id="generate-icon" />
            </SmallLlmChatButton>
        )}
    </>
)

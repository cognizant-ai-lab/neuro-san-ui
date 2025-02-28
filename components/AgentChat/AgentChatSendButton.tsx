import SendIcon from "@mui/icons-material/Send"

import {LlmChatButton} from "../internal/LlmChatButton"

// #region: Types
interface AgentChatSendButtonProps {
    enableSendButton: boolean
    id: string
    onClickCallback: () => void
}
// #endregion: Types

/**
 * Generate the agent buttons for the Opportunity Finder agents.
 * @returns A div containing the agent buttons
 */
export const AgentChatSendButton: React.FC<AgentChatSendButtonProps> = ({enableSendButton, id, onClickCallback}) => (
    <LlmChatButton
        aria-label="Send"
        id={id}
        disabled={!enableSendButton}
        onClick={onClickCallback}
        posBottom={0}
        posRight={0}
        sx={{
            opacity: !enableSendButton ? "50%" : "100%",
            color: "white !important",
            fontSize: "15px",
            fontWeight: "500",
            lineHeight: "38px",
            padding: "0.6rem",
            position: "relative",
            width: 50,
        }}
    >
        <SendIcon
            fontSize="small"
            id="stop-button-icon" // Could update this but it would impact QA
        />
    </LlmChatButton>
)

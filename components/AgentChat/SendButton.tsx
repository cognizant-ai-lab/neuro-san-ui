import SendIcon from "@mui/icons-material/Send"

import {LlmChatButton} from "./LlmChatButton"

// #region: Types
interface SendButtonProps {
    enableSendButton: boolean
    id: string
    onClickCallback: () => void
}
// #endregion: Types

/**
 * Generate the Send Button for a chat window.
 * @returns The Send Button.
 */
export const SendButton: React.FC<SendButtonProps> = ({enableSendButton, id, onClickCallback}) => (
    <LlmChatButton
        aria-label="Send"
        id={id}
        disabled={!enableSendButton}
        onClick={onClickCallback}
        sx={{
            padding: "0.6rem",
            position: "relative",
        }}
    >
        <SendIcon
            fontSize="small"
            id="stop-button-icon" // Could update this but it would impact QA
        />
    </LlmChatButton>
)

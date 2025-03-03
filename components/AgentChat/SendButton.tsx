import SendIcon from "@mui/icons-material/Send"

import {LlmChatButton} from "../internal/LlmChatButton"

// #region: Types
interface SendButtonProps {
    enableSendButton: boolean
    id: string
    onClickCallback: () => void
}
// #endregion: Types

export const SendButton: React.FC<SendButtonProps> = ({enableSendButton, id, onClickCallback}) => (
    <LlmChatButton
        aria-label="Send"
        id={id}
        disabled={!enableSendButton}
        onClick={onClickCallback}
        posBottom={0}
        posRight={0}
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

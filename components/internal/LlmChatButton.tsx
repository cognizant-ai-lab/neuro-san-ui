import {styled} from "@mui/material"
import Button from "@mui/material/Button"

// #region: Types

type LLMChatGroupConfigBtnProps = {
    enabled?: boolean
    posRight?: number
    posBottom?: number
}

// #endregion: Types

export const LlmChatButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== "posRight" && prop !== "posBottom",
})<LLMChatGroupConfigBtnProps>(({disabled, posRight, posBottom}) => ({
    background: "var(--bs-primary) !important",
    borderColor: "var(--bs-primary) !important",
    borderRadius: "var(--bs-border-radius)",
    bottom: posBottom || null,
    color: "white !important",
    display: "inline",
    fontSize: "15px",
    fontWeight: "500",
    right: posRight || null,
    lineHeight: "38px",
    padding: "2px",
    width: 126,
    zIndex: 99999,
    opacity: disabled ? "50%" : "70%",
    cursor: disabled ? "default" : "pointer",
}))

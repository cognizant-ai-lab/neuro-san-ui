import {styled} from "@mui/material"
import Button from "@mui/material/Button"

// #region: Types

type LLMChatGroupConfigBtnProps = {
    disabled?: boolean
    posRight?: number
    posBottom?: number
}

// #endregion: Types

export const LlmChatButton = styled(Button, {
    shouldForwardProp: (prop) => !["posRight", "posBottom"].includes(String(prop)),
})<LLMChatGroupConfigBtnProps>(({disabled, posRight, posBottom}) => ({
    background: "var(--bs-primary) !important",
    borderRadius: "var(--bs-border-radius)",
    bottom: posBottom !== undefined ? posBottom : 0,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? "50%" : "100%",
    right: posRight !== undefined ? posRight : 0,
    position: "absolute",
}))

export const SmallLlmChatButton = styled(LlmChatButton)({
    minWidth: 0,
    padding: "0.25rem",
})

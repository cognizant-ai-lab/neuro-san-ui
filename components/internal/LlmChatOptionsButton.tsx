import {styled} from "@mui/material"
import Button from "@mui/material/Button"

type LLMChatGroupConfigBtnProps = {
    enabled?: boolean
    posRight?: number
    posBottom?: number
}

export const LlmChatOptionsButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== "enabled" && prop !== "posRight",
})<LLMChatGroupConfigBtnProps>(({enabled, posRight}) => ({
    position: "absolute",
    top: 10,
    right: posRight || null,
    zIndex: 99999,
    background: `${enabled ? "var(--bs-primary)" : "darkgray"} !important`,
    borderColor: `${enabled ? "var(--bs-primary)" : "darkgray"} !important`,
    borderRadius: "var(--bs-border-radius)",
    width: "30px",
    height: "30px",
}))

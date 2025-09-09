import {styled} from "@mui/material"
import Button from "@mui/material/Button"

import {getZIndex} from "../../utils/zIndexLayers"

type LLMChatGroupConfigBtnProps = {
    enabled?: boolean
    posRight?: number
    posBottom?: number
}

export const LlmChatOptionsButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== "enabled" && prop !== "posRight" && prop !== "posBottom",
})<LLMChatGroupConfigBtnProps>(({enabled, posRight}) => ({
    position: "absolute",
    top: 10,
    right: posRight || null,
    zIndex: getZIndex(1, null), // Seems to only be needed on Analytics Chat, but apply to all.
    background: `${enabled ? "var(--bs-primary)" : "darkgray"} !important`,
    borderColor: `${enabled ? "var(--bs-primary)" : "darkgray"} !important`,
    borderRadius: "var(--bs-border-radius)",
    width: "30px",
    height: "30px",
}))

import {Button, styled} from "@mui/material"

import {ZIndexLayers} from "../../utils/zIndexLayers"

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
    zIndex: ZIndexLayers.LAYER_1, // Seems to only be needed on Analytics Chat, but apply to all.
    background: `${enabled ? "var(--bs-primary)" : "darkgray"} !important`,
    borderColor: `${enabled ? "var(--bs-primary)" : "darkgray"} !important`,
    borderRadius: "var(--bs-border-radius)",
    width: "30px",
    height: "30px",
}))

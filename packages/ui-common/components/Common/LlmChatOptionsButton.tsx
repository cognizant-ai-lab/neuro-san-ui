/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import Button from "@mui/material/Button"
import {styled} from "@mui/material/styles"

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
    borderRadius: "var(--bs-border-radius)",
    width: "30px",
    height: "30px",
}))

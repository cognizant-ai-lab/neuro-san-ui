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

//#region: Types

type LLMChatGroupConfigBtnProps = {
    disabled?: boolean
}

//#endregion: Types

// In LlmChatButton.tsx
export const LlmChatButton = styled(Button)<LLMChatGroupConfigBtnProps>(({disabled, theme}) => ({
    backgroundColor: theme.palette.background.paper,
    borderRadius: "var(--bs-border-radius)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? "50%" : "100%",
    padding: "0.5rem",
}))

export const SmallLlmChatButton = styled(LlmChatButton)({
    minWidth: 0,
    padding: "0.25rem",
})

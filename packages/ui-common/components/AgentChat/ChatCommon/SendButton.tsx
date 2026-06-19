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

import SendIcon from "@mui/icons-material/Send"
import Tooltip from "@mui/material/Tooltip"
import {FC} from "react"

import {LlmChatButton} from "../Common/LlmChatButton"

//#region: Types
interface SendButtonProps {
    enableSendButton: boolean
    id: string
    onClickCallback: () => void
}
//#endregion: Types

/**
 * Generate the Send Button for a chat window.
 * @returns The Send Button.
 */
export const SendButton: FC<SendButtonProps> = ({enableSendButton, id, onClickCallback}) => (
    <Tooltip
        placement="top"
        title={enableSendButton ? "Send" : "Enter a message to enable the send button"}
    >
        {/*Span required so that tooltip is displayed when button is disabled. Known MUI issue.*/}
        <span
            style={{
                display: "inline-block",
                cursor: enableSendButton ? "inherit" : "not-allowed",
            }}
        >
            <LlmChatButton
                aria-label="Send"
                disabled={!enableSendButton}
                id={id}
                onClick={onClickCallback}
                tabIndex={0}
            >
                <SendIcon
                    fontSize="small"
                    id="stop-button-icon" // Could update this but it would impact QA
                />
            </LlmChatButton>
        </span>
    </Tooltip>
)

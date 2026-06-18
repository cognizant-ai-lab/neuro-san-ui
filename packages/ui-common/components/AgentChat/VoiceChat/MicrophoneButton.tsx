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

import MicNoneIcon from "@mui/icons-material/MicNone"
import MicOffIcon from "@mui/icons-material/MicOff"
import Tooltip from "@mui/material/Tooltip"
import {Dispatch, FC, RefObject, SetStateAction} from "react"

import {checkSpeechSupport, SpeechRecognitionState, toggleListening} from "./VoiceChat"
import {LlmChatButton} from "../Common/LlmChatButton"

//#region: Types
export interface MicrophoneButtonProps {
    /**
     * Whether microphone/voice mode is currently enabled
     */
    isMicOn: boolean

    /**
     * Function to toggle the microphone state
     */
    onMicToggle: (newState: boolean) => void

    /**
     * Reference to the SpeechRecognition instance
     */
    speechRecognitionRef: RefObject<SpeechRecognition | null>

    /**
     * Current voice input state
     */
    voiceInputState: SpeechRecognitionState

    /**
     * Function to update voice input state
     */
    setVoiceInputState: Dispatch<SetStateAction<SpeechRecognitionState>>
}
//#endregion: Types

/**
 * Microphone button component for voice input functionality.
 * Handles toggling voice recognition on/off and displays appropriate visual feedback.
 */
export const MicrophoneButton: FC<MicrophoneButtonProps> = ({
    isMicOn,
    onMicToggle,
    speechRecognitionRef,
    voiceInputState,
    setVoiceInputState,
}) => {
    const speechSupported = checkSpeechSupport()

    const handleClick = async () => {
        const newMicState = !isMicOn
        onMicToggle(newMicState)

        if (!speechSupported) return

        // If turning off the microphone, immediately update the voice state
        if (!newMicState) {
            setVoiceInputState((prev) => ({
                ...prev,
                isListening: false,
                isProcessingSpeech: false,
            }))
        }

        await toggleListening(newMicState, speechRecognitionRef.current)
    }

    const isDisabled = !speechSupported
    const tooltipText = speechSupported
        ? isMicOn
            ? "Turn microphone off"
            : "Turn microphone on"
        : "Voice input is only supported in Google Chrome on Mac or Windows."

    const isListeningActive = isMicOn && voiceInputState.isListening

    return (
        <Tooltip
            placement="top"
            title={tooltipText}
        >
            {/*Span required so that tooltip is displayed when button is disabled. Known MUI issue.*/}
            <span
                style={{
                    display: "inline-block",
                    cursor: isDisabled ? "not-allowed" : "inherit",
                }}
            >
                <LlmChatButton
                    data-testid="microphone-button"
                    disabled={isDisabled}
                    id="microphone-button"
                    onClick={handleClick}
                    sx={{
                        backgroundColor: isListeningActive ? "success.main" : "background.paper",
                    }}
                    tabIndex={0}
                >
                    {voiceInputState.isListening ? (
                        <MicNoneIcon
                            data-testid="MicNoneIcon"
                            fontSize="small"
                        />
                    ) : (
                        <MicOffIcon
                            data-testid="MicOffIcon"
                            fontSize="small"
                        />
                    )}
                </LlmChatButton>
            </span>
        </Tooltip>
    )
}

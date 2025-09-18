import MicNoneIcon from "@mui/icons-material/MicNone"
import MicOffIcon from "@mui/icons-material/MicOff"
import Tooltip from "@mui/material/Tooltip"
import {Dispatch, FC, MutableRefObject, SetStateAction} from "react"

import {LlmChatButton} from "../LlmChatButton"
import {checkSpeechSupport, SpeechRecognitionState, toggleListening} from "./VoiceChat"

// #region: Types
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
    speechRecognitionRef: MutableRefObject<SpeechRecognition | null>

    /**
     * Current voice input state
     */
    voiceInputState: SpeechRecognitionState

    /**
     * Function to update voice input state
     */
    setVoiceInputState: Dispatch<SetStateAction<SpeechRecognitionState>>
}
// #endregion: Types

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
    const tooltipText = !speechSupported
        ? "Voice input is only supported in Google Chrome on Mac or Windows."
        : isMicOn
          ? "Turn microphone off"
          : "Turn microphone on"

    return (
        <Tooltip title={tooltipText}>
            <span style={{display: "inline-block", height: 50, width: 64}}>
                <LlmChatButton
                    data-testid="microphone-button"
                    disabled={isDisabled}
                    id="microphone-button"
                    onClick={handleClick}
                    sx={{
                        padding: "0.5rem",
                        right: 70,
                        backgroundColor:
                            isMicOn && voiceInputState.isListening ? "var(--bs-success)" : "var(--bs-secondary)",
                    }}
                    tabIndex={0}
                >
                    {voiceInputState.isListening ? (
                        <MicNoneIcon
                            sx={{color: "var(--bs-white)"}}
                            data-testid="MicNoneIcon"
                        />
                    ) : (
                        <MicOffIcon
                            sx={{color: "var(--bs-white)"}}
                            data-testid="MicOffIcon"
                        />
                    )}
                </LlmChatButton>
            </span>
        </Tooltip>
    )
}

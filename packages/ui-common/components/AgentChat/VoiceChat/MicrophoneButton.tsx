import MicNoneIcon from "@mui/icons-material/MicNone"
import MicOffIcon from "@mui/icons-material/MicOff"
import Tooltip from "@mui/material/Tooltip"
import {FC, MutableRefObject} from "react"

import {LlmChatButton} from "../LlmChatButton"
import {toggleListening, VoiceChatState} from "./VoiceChat"

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
     * Current voice recognition state
     */
    voiceState: VoiceChatState

    /**
     * Whether speech recognition is supported in this browser
     */
    speechSupported: boolean

    /**
     * Reference to the SpeechRecognition instance
     */
    recognitionRef: MutableRefObject<SpeechRecognition | null>
}
// #endregion: Types

/**
 * Microphone button component for voice input functionality.
 * Handles toggling voice recognition on/off and displays appropriate visual feedback.
 */
export const MicrophoneButton: FC<MicrophoneButtonProps> = ({
    isMicOn,
    onMicToggle,
    voiceState,
    speechSupported,
    recognitionRef,
}) => {
    const handleClick = async () => {
        const newMicState = !isMicOn
        onMicToggle(newMicState)

        if (!speechSupported) return

        await toggleListening(recognitionRef.current, voiceState, speechSupported)
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
                            isMicOn && voiceState.isListening ? "var(--bs-success)" : "var(--bs-secondary)",
                    }}
                    tabIndex={0}
                >
                    {voiceState.isListening ? (
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

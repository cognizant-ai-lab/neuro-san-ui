import MicNoneIcon from "@mui/icons-material/MicNone"
import MicOffIcon from "@mui/icons-material/MicOff"
import Tooltip from "@mui/material/Tooltip"
import {FC} from "react"

import {LlmChatButton} from "./LlmChatButton"
import {toggleListening, VoiceChatConfig, VoiceChatState} from "./VoiceChat"

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
     * Function to update voice state
     */
    setVoiceState: (updater: (prev: VoiceChatState) => VoiceChatState) => void

    /**
     * Whether speech recognition is supported in this browser
     */
    speechSupported: boolean

    /**
     * Voice recognition object reference
     */
    recognition: unknown | null

    /**
     * Callback when a message should be sent
     */
    onSendMessage: (message: string) => void

    /**
     * Callback when transcript changes
     */
    onTranscriptChange: (transcript: string) => void
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
    setVoiceState,
    speechSupported,
    recognition,
    onSendMessage,
    onTranscriptChange,
}) => {
    const handleClick = async () => {
        const newMicState = !isMicOn
        onMicToggle(newMicState)

        const voiceConfig: VoiceChatConfig = {
            onSendMessage,
            onTranscriptChange,
            onSpeakingChange: (isSpeaking) => {
                setVoiceState((prev) => ({...prev, isSpeaking}))
            },
            onListeningChange: (isListening) => {
                setVoiceState((prev) => ({...prev, isListening}))
            },
        }

        await toggleListening(recognition, voiceState, voiceConfig, setVoiceState, speechSupported)
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

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
     * Whether the LLM is currently processing a request
     */
    isAwaitingLlm: boolean

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
    isAwaitingLlm,
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

        // Always call toggleListening - it will handle start/stop based on current state
        await toggleListening(recognition, voiceState, voiceConfig, setVoiceState)
    }

    // Show a more descriptive tooltip if speech is not supported (i.e., not Chrome)
    const tooltipText = !voiceState.speechSupported
        ? "Voice input is only supported in Google Chrome on Mac or Windows."
        : isMicOn
          ? "Turn microphone off"
          : "Turn microphone on"

    if (!voiceState.speechSupported) {
        return null
    }
    return (
        <Tooltip title={tooltipText}>
            <span>
                <LlmChatButton
                    id="microphone-button"
                    data-testid="microphone-button"
                    onClick={handleClick}
                    sx={{
                        padding: "0.5rem",
                        right: 70,
                        backgroundColor:
                            isMicOn && voiceState.isListening ? "var(--bs-success)" : "var(--bs-secondary)",
                        opacity: 1,
                    }}
                    disabled={isAwaitingLlm}
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

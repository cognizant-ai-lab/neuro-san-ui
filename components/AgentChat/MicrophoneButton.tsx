import MicNoneIcon from "@mui/icons-material/MicNone"
import MicOffIcon from "@mui/icons-material/MicOff"
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
     * Timer references for voice recognition
     */
    timers: {silenceTimer: ReturnType<typeof setTimeout> | null}

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
    timers,
    onSendMessage,
    onTranscriptChange,
}) => {
    const handleClick = async () => {
        const newMicState = !isMicOn
        onMicToggle(newMicState)

        if (newMicState) {
            // Starting voice mode - toggle listening
            const voiceConfig: VoiceChatConfig = {
                onSendMessage,
                onTranscriptChange,
                onSpeakingChange: (isSpeaking) => {
                    setVoiceState((prev) => ({...prev, isSpeaking}))
                },
                onListeningChange: (isListening) => {
                    setVoiceState((prev) => ({...prev, isListening}))
                },
                autoSpeakResponses: newMicState,
            }

            await toggleListening(recognition, voiceState, voiceConfig, setVoiceState, timers)
        } else {
            // Stopping voice mode - toggle listening off
            const voiceConfig: VoiceChatConfig = {
                onSendMessage,
                onTranscriptChange,
                onSpeakingChange: (isSpeaking) => {
                    setVoiceState((prev) => ({...prev, isSpeaking}))
                },
                onListeningChange: (isListening) => {
                    setVoiceState((prev) => ({...prev, isListening}))
                },
                autoSpeakResponses: false,
            }

            await toggleListening(recognition, voiceState, voiceConfig, setVoiceState, timers)

            // Keep any transcript that was captured so user can review/edit before sending
        }
    }

    return (
        <LlmChatButton
            id="microphone-button"
            onClick={handleClick}
            sx={{
                padding: "0.5rem",
                right: 70,
                backgroundColor: voiceState.isListening ? "var(--bs-success)" : "var(--bs-secondary)",
                opacity: voiceState.speechSupported ? 1 : 0.5,
            }}
            disabled={!voiceState.speechSupported || isAwaitingLlm}
        >
            {voiceState.isListening ? (
                <MicNoneIcon sx={{color: "var(--bs-white)"}} />
            ) : (
                <MicOffIcon sx={{color: "var(--bs-white)"}} />
            )}
        </LlmChatButton>
    )
}

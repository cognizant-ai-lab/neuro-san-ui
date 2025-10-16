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

import {Dispatch, SetStateAction} from "react"

// #region: Types

interface SpeechRecognitionHandlers {
    end: () => void
    error: (event: SpeechRecognitionErrorEvent) => void
    result: (event: SpeechRecognitionEvent) => void
    start: () => void
}

export interface SpeechRecognitionState {
    /**
     * currentTranscript holds the interim (live) speech recognition results as the user is speaking.
     * This provides real-time feedback in the UI, showing what the system is currently hearing.
     */
    currentTranscript: string
    /**
     * finalTranscript contains the finalized speech recognition result for a segment.
     * This is stable and ready to be used as chat input after the system is confident about what was said.
     */

    finalTranscript: string
    /**
     * isListening indicates whether the system is actively listening for speech input.
     * Used to control UI state and microphone activity.
     */
    isListening: boolean
    /**
     * isProcessingSpeech indicates whether the system is currently processing interim speech results.
     * Used to show loading indicators or disable UI actions during processing.
     */
    isProcessingSpeech: boolean
}

// #endregion: Types

// Check if browser is Chrome (excluding Edge). Only Chrome (on Mac OS and Windows) has full support for
// SpeechRecognition. Also, tested that this will exclude Firefox and Safari.
const isChrome = (): boolean =>
    /Chrome/u.test(navigator.userAgent) && !/Edge/u.test(navigator.userAgent) && !/Edg\//u.test(navigator.userAgent)

// Check browser/platform support
export const checkSpeechSupport = (): boolean => {
    if (typeof window === "undefined") return false

    // Check if browser supports SpeechRecognition
    const hasSpeechRecognition = "SpeechRecognition" in window

    // Only Chrome provides reliable speech recognition support
    return hasSpeechRecognition && isChrome()
}

// Handle speech recognition start
const handleRecognitionStart = (setVoiceInputState: Dispatch<SetStateAction<SpeechRecognitionState>>) => (): void => {
    setVoiceInputState((prev) => ({
        ...prev,
        currentTranscript: "",
        isListening: true,
    }))
}

// Handle speech recognition end
const handleRecognitionEnd = (setVoiceInputState: Dispatch<SetStateAction<SpeechRecognitionState>>) => (): void => {
    setVoiceInputState((prev) => ({
        ...prev,
        isListening: false,
        isProcessingSpeech: false,
    }))
}

// Handle speech recognition results
const handleRecognitionResult =
    (
        setVoiceInputState: Dispatch<SetStateAction<SpeechRecognitionState>>,
        setChatInput: Dispatch<SetStateAction<string>>
    ) =>
    (event: SpeechRecognitionEvent): void => {
        // interimTranscript: accumulates live (non-final) results for real-time feedback (currentTranscript).
        let interimTranscript = ""
        // finalTranscript: accumulates finalized results for input (finalTranscript).
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
                // Finalized segment, ready for input
                finalTranscript += transcript
            } else {
                // Live segment, for real-time feedback
                interimTranscript += transcript
            }
        }

        setVoiceInputState((prev) => ({
            ...prev,
            currentTranscript: interimTranscript,
            finalTranscript,
            // Always show loading indicator while listening, until final transcript or recognition end
            isProcessingSpeech: true,
        }))

        // Process final transcript
        if (finalTranscript) {
            setVoiceInputState((prev) => ({
                ...prev,
                isProcessingSpeech: false,
            }))
            setChatInput((prev: string) => {
                const needsSpace = prev && !prev.endsWith(" ")
                return prev + (needsSpace ? " " : "") + finalTranscript
            })
        }
    }

// Handle speech recognition errors
const handleRecognitionError =
    (setVoiceInputState: Dispatch<SetStateAction<SpeechRecognitionState>>) =>
    (event: SpeechRecognitionErrorEvent): void => {
        console.error("Speech recognition error:", event.error)
        setVoiceInputState((prev) => ({
            ...prev,
            isListening: false,
            isProcessingSpeech: false,
        }))
    }

// Remove speech recognition event handlers and stop speech recognition
export function cleanupAndStopSpeechRecognition(
    speechRecognitionRef: React.MutableRefObject<SpeechRecognition | null>,
    handlers: SpeechRecognitionHandlers | null
): void {
    const speechRecognition = speechRecognitionRef.current
    if (!speechRecognition || !handlers) return

    speechRecognition.removeEventListener("end", handlers.end)
    speechRecognition.removeEventListener("error", handlers.error)
    speechRecognition.removeEventListener("result", handlers.result)
    speechRecognition.removeEventListener("start", handlers.start)

    try {
        speechRecognition.stop()
    } catch (error) {
        console.warn("Error stopping speechRecognition:", error)
    }
    speechRecognitionRef.current = null
}

export function setupSpeechRecognition(
    setChatInput: Dispatch<SetStateAction<string>>,
    setVoiceInputState: Dispatch<SetStateAction<SpeechRecognitionState>>,
    speechRecognitionRef: React.MutableRefObject<SpeechRecognition | null>
): SpeechRecognitionHandlers | null {
    const speechSupported = checkSpeechSupport()

    if (speechSupported) {
        const speechRecognition = new SpeechRecognition()

        speechRecognition.continuous = true
        speechRecognition.interimResults = true
        speechRecognition.lang = navigator.language || "en-US"

        // Create handler references
        const handlers: SpeechRecognitionHandlers = {
            end: handleRecognitionEnd(setVoiceInputState),
            error: handleRecognitionError(setVoiceInputState),
            result: handleRecognitionResult(setVoiceInputState, setChatInput),
            start: handleRecognitionStart(setVoiceInputState),
        }

        speechRecognition.addEventListener("end", handlers.end)
        speechRecognition.addEventListener("error", handlers.error)
        speechRecognition.addEventListener("result", handlers.result)
        speechRecognition.addEventListener("start", handlers.start)

        speechRecognitionRef.current = speechRecognition
        return handlers
    } else {
        speechRecognitionRef.current = null
        return null
    }
}

// Request microphone permission
const requestMicrophonePermission = async (): Promise<boolean> => {
    if (!isChrome()) return false

    if ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            })
            stream.getTracks().forEach((track) => track.stop())
            return true
        } catch (error: unknown) {
            if (
                error instanceof Error &&
                (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
            ) {
                return false
            }
            // For other errors, still allow recognition to proceed (Chrome supports it)
            return true
        }
    }
    return false
}

// Toggle listening function
export const toggleListening = async (isMicOn: boolean, recognition: SpeechRecognition | null): Promise<void> => {
    if (!recognition) return

    if (isMicOn) {
        // Request microphone permission before starting
        const hasPermission = await requestMicrophonePermission()
        if (hasPermission) {
            recognition.start()
        }
    } else {
        // Stop recognition immediately
        try {
            recognition.stop()
        } catch (error) {
            console.warn("Error stopping speech recognition:", error)
        }
    }
}

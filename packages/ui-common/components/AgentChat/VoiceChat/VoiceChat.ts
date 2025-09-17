import {Dispatch, MutableRefObject, SetStateAction} from "react"

// #region: Types

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
const isChromeDetection = (): boolean =>
    /Chrome/u.test(navigator.userAgent) && !/Edge/u.test(navigator.userAgent) && !/Edg\//u.test(navigator.userAgent)

// Check browser/platform support
export const checkSpeechSupport = (): boolean => {
    if (typeof window === "undefined") return false

    // Check if browser supports SpeechRecognition
    const hasSpeechRecognition = "SpeechRecognition" in window

    // Only Chrome provides reliable speech recognition support
    return hasSpeechRecognition && isChromeDetection()
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
export const cleanupAndStopSpeechRecognition = (
    setChatInput: Dispatch<SetStateAction<string>>,
    setVoiceInputState: Dispatch<SetStateAction<SpeechRecognitionState>>,
    speechRecognitionRef: MutableRefObject<SpeechRecognition | null>
): void => {
    // If speech recognition ref or removeEventListener are null, return
    if (!speechRecognitionRef?.current || typeof speechRecognitionRef.current.removeEventListener !== "function") return

    speechRecognitionRef.current.removeEventListener("end", handleRecognitionEnd(setVoiceInputState))
    speechRecognitionRef.current.removeEventListener("error", handleRecognitionError(setVoiceInputState))
    speechRecognitionRef.current.removeEventListener(
        "result",
        handleRecognitionResult(setVoiceInputState, setChatInput)
    )
    speechRecognitionRef.current.removeEventListener("start", handleRecognitionStart(setVoiceInputState))

    try {
        speechRecognitionRef.current.stop()
    } catch (error) {
        console.warn("Error stopping speechRecognition:", error)
    }
}

export const setupSpeechRecognition = (
    setChatInput: Dispatch<SetStateAction<string>>,
    setVoiceInputState: Dispatch<SetStateAction<SpeechRecognitionState>>,
    speechRecognitionRef: MutableRefObject<SpeechRecognition | null>
): {
    speechRecognitionRef: MutableRefObject<SpeechRecognition | null>
} => {
    const speechSupported = checkSpeechSupport()

    if (speechSupported) {
        const speechRecognition = new SpeechRecognition()

        speechRecognition.continuous = true
        speechRecognition.interimResults = true
        speechRecognition.lang = navigator.language || "en-US"

        speechRecognition.addEventListener("end", handleRecognitionEnd(setVoiceInputState))
        speechRecognition.addEventListener("error", handleRecognitionError(setVoiceInputState))
        speechRecognition.addEventListener("result", handleRecognitionResult(setVoiceInputState, setChatInput))
        speechRecognition.addEventListener("start", handleRecognitionStart(setVoiceInputState))

        speechRecognitionRef.current = speechRecognition
    } else {
        speechRecognitionRef.current = null
    }

    return {speechRecognitionRef}
}

// Request microphone permission
const requestMicrophonePermission = async (): Promise<boolean> => {
    if (!isChromeDetection()) return false

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

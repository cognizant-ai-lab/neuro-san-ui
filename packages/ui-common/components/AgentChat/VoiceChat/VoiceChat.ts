import {Dispatch, MutableRefObject, SetStateAction, useEffect, useMemo, useRef} from "react"

// #region: Types

export interface VoiceChatState {
    isListening: boolean
    currentTranscript: string
    isSpeaking: boolean
    finalTranscript: string
}

export interface VoiceChatEventHandlers {
    onStart: () => void
    onEnd: () => void
    onResult: (event: SpeechRecognitionEvent) => void
    onError: (event: SpeechRecognitionErrorEvent) => void
}

interface UseVoiceRecognitionProps {
    setVoiceState: Dispatch<SetStateAction<VoiceChatState>>
    setIsProcessingSpeech: Dispatch<SetStateAction<boolean>>
    setChatInput: Dispatch<SetStateAction<string>>
}

// #endregion: Types

// Check if browser is Chrome (excluding Edge)
const isChromeDetection = (): boolean => {
    // TODO: For tests, may update
    if (typeof navigator === "undefined" || !navigator.userAgent) return false

    return (
        /Chrome/u.test(navigator.userAgent) && !/Edge/u.test(navigator.userAgent) && !/Edg\//u.test(navigator.userAgent)
    )
}

// Check browser/platform support
export const checkSpeechSupport = (): boolean => {
    if (typeof window === "undefined") return false

    // Check if browser supports Web Speech API and the constructors actually exist
    const hasSpeechRecognition =
        ("webkitSpeechRecognition" in window && window.webkitSpeechRecognition) ||
        ("SpeechRecognition" in window && window.SpeechRecognition) ||
        false

    // Only Chrome provides reliable speech recognition support
    return hasSpeechRecognition && isChromeDetection()
}

// Handle recognition start
const handleRecognitionStart =
    (
        setVoiceState: Dispatch<SetStateAction<VoiceChatState>>,
        setIsProcessingSpeech: Dispatch<SetStateAction<boolean>>
    ) =>
    (): void => {
        setVoiceState((prev) => ({...prev, isListening: true, currentTranscript: ""}))
        setIsProcessingSpeech(true)
    }

// Handle recognition end
const handleRecognitionEnd =
    (
        setVoiceState: Dispatch<SetStateAction<VoiceChatState>>,
        setIsProcessingSpeech: Dispatch<SetStateAction<boolean>>
    ) =>
    (): void => {
        setVoiceState((prev) => ({...prev, isListening: false}))
        setIsProcessingSpeech(false)
    }

// Handle recognition results
const handleRecognitionResult =
    (
        setVoiceState: Dispatch<SetStateAction<VoiceChatState>>,
        setIsProcessingSpeech: Dispatch<SetStateAction<boolean>>,
        setChatInput: Dispatch<SetStateAction<string>>
    ) =>
    (event: SpeechRecognitionEvent): void => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
                finalTranscript += transcript
            } else {
                interimTranscript += transcript
            }
        }

        setVoiceState((prev) => ({
            ...prev,
            currentTranscript: interimTranscript,
            finalTranscript,
        }))

        // Show loading indicator while processing interim results
        if (interimTranscript) {
            setIsProcessingSpeech(true)
        }

        // Process final transcript
        if (finalTranscript) {
            setIsProcessingSpeech(false)
            setChatInput((prev: string) => {
                const needsSpace = prev && !prev.endsWith(" ")
                return prev + (needsSpace ? " " : "") + finalTranscript
            })
        }
    }

// Handle recognition errors
const handleRecognitionError =
    (
        setVoiceState: Dispatch<SetStateAction<VoiceChatState>>,
        setIsProcessingSpeech: Dispatch<SetStateAction<boolean>>
    ) =>
    (event: SpeechRecognitionErrorEvent): void => {
        console.error("Speech recognition error:", event.error)
        setVoiceState((prev) => ({...prev, isListening: false}))
        setIsProcessingSpeech(false)
    }

// Setup voice recognition with event handlers
const setupVoiceRecognition = (eventHandlers: VoiceChatEventHandlers): SpeechRecognition | null => {
    if (!checkSpeechSupport()) return null

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionClass()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || "en-US"

    recognition.addEventListener("start", eventHandlers.onStart)
    recognition.addEventListener("end", eventHandlers.onEnd)
    recognition.addEventListener("result", eventHandlers.onResult)
    recognition.addEventListener("error", eventHandlers.onError)

    return recognition
}

// Cleanup voice recognition
const cleanupVoiceRecognition = (
    recognition: SpeechRecognition | null,
    eventHandlers: VoiceChatEventHandlers
): void => {
    if (!recognition) return

    // TODO: For tests, may update
    if (typeof recognition.removeEventListener === "function") {
        recognition.removeEventListener("start", eventHandlers.onStart)
        recognition.removeEventListener("end", eventHandlers.onEnd)
        recognition.removeEventListener("result", eventHandlers.onResult)
        recognition.removeEventListener("error", eventHandlers.onError)
    }

    try {
        recognition.stop()
    } catch (error) {
        console.warn("Error stopping recognition:", error)
    }
}

// Custom useVoiceRecognition hook
export function useVoiceRecognition({setVoiceState, setIsProcessingSpeech, setChatInput}: UseVoiceRecognitionProps): {
    recognitionRef: MutableRefObject<SpeechRecognition | null>
    speechSupported: boolean
} {
    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const speechSupported = checkSpeechSupport()

    // Create stable event handlers using useMemo
    const eventHandlers = useMemo(
        (): VoiceChatEventHandlers => ({
            onStart: handleRecognitionStart(setVoiceState, setIsProcessingSpeech),
            onEnd: handleRecognitionEnd(setVoiceState, setIsProcessingSpeech),
            onResult: handleRecognitionResult(setVoiceState, setIsProcessingSpeech, setChatInput),
            onError: handleRecognitionError(setVoiceState, setIsProcessingSpeech),
        }),
        [setVoiceState, setIsProcessingSpeech, setChatInput]
    )

    // Setup and cleanup voice recognition
    useEffect(() => {
        if (speechSupported) {
            recognitionRef.current = setupVoiceRecognition(eventHandlers)
        }

        return () => {
            if (recognitionRef.current) {
                cleanupVoiceRecognition(recognitionRef.current, eventHandlers)
                recognitionRef.current = null
            }
        }
    }, [speechSupported, eventHandlers])

    return {
        recognitionRef,
        speechSupported,
    }
}

// Toggle listening function
export const toggleListening = async (
    recognition: SpeechRecognition | null,
    voiceState: VoiceChatState,
    speechSupported: boolean
): Promise<void> => {
    if (!speechSupported || !recognition) return

    if (voiceState.isListening) {
        recognition.stop()
    } else {
        // Request microphone permission before starting
        const hasPermission = await requestMicrophonePermission()
        if (hasPermission) {
            recognition.start()
        }
    }
}

// Stop speech synthesis
export const stopSpeechSynthesis = (): void => {
    if ("speechSynthesis" in window && window.speechSynthesis) {
        window.speechSynthesis.cancel()
    }
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

// Clean up function
export const cleanup = (recognition: SpeechRecognition | null, eventHandlers: VoiceChatEventHandlers): void => {
    cleanupVoiceRecognition(recognition, eventHandlers)
    stopSpeechSynthesis()
}

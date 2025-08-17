// Basic SpeechRecognition interface
interface SpeechRecognition {
    continuous: boolean
    interimResults: boolean
    lang: string
    onstart: (() => void) | null
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: ((event: unknown) => void) | null
    onend: (() => void) | null
    start: () => void
    stop: () => void
    addEventListener: (type: string, listener: () => void) => void
}

interface SpeechRecognitionEvent {
    resultIndex: number
    results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
    length: number
    [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
    isFinal: boolean
    [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
    transcript: string
}

export interface VoiceChatConfig {
    onSendMessage: (message: string) => void
    onTranscriptChange?: (transcript: string) => void
    onSpeakingChange?: (isSpeaking: boolean) => void
    onListeningChange?: (isListening: boolean) => void
}

export interface VoiceChatState {
    isListening: boolean
    currentTranscript: string
    speechSupported: boolean
    isSpeaking: boolean
    finalTranscript: string
}

// Check browser/platform support
export const checkSpeechSupport = (): boolean => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        return false
    }
    const isChrome = /Chrome/u.test(navigator.userAgent) && !/Edge/u.test(navigator.userAgent)
    const isMacOS =
        navigator.userAgent.includes("Macintosh") ||
        ((navigator as {platform?: string}).platform?.includes("Mac") ?? false)
    const isWindows = navigator.userAgent.includes("Windows")
    return isChrome && (isMacOS || isWindows)
}

// Request microphone permission
const requestMicrophonePermission = async (): Promise<boolean> => {
    const isChrome = /Chrome/u.test(navigator.userAgent) && !/Edge/u.test(navigator.userAgent)
    if (isChrome && "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
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
        }
    }
    return true
}

// Factory function to create speech recognition
export const createSpeechRecognition = (
    config: VoiceChatConfig,
    setState: (updater: (prev: VoiceChatState) => VoiceChatState) => void
) => {
    if (!checkSpeechSupport()) return undefined

    const SpeechRecognitionClass =
        (window as unknown as Record<string, unknown>)["SpeechRecognition"] ||
        (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"]
    const recognition = new (SpeechRecognitionClass as new () => SpeechRecognition)()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onstart = () => {
        setState((prev) => ({...prev, isListening: true}))
        config.onListeningChange?.(true)
    }

    recognition.onend = () => {
        setState((prev) => {
            // Do not auto-send message, just stop listening and preserve transcript
            config.onListeningChange?.(false)
            return {
                ...prev,
                isListening: false,
            }
        })
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
        setState((prev) => {
            // Stop speaking if we detect interruption
            if (prev.isSpeaking) {
                stopSpeechSynthesis()
                config.onSpeakingChange?.(false)
            }

            const {interimTranscript, finalTranscript} = processRecognitionResult(event)
            const newFinalTranscript = prev.finalTranscript + finalTranscript
            const newCurrentTranscript = newFinalTranscript + interimTranscript

            config.onTranscriptChange?.(newCurrentTranscript)

            return {
                ...prev,
                finalTranscript: newFinalTranscript,
                currentTranscript: newCurrentTranscript,
                isSpeaking: false,
            }
        })
    }

    recognition.addEventListener("error", () => {
        setState((prev) => ({...prev, isListening: false}))
        config.onListeningChange?.(false)
    })

    return recognition
}

// Process speech results
const processRecognitionResult = (event: SpeechRecognitionEvent) => {
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

    return {interimTranscript, finalTranscript}
}

// Stop speech synthesis
export const stopSpeechSynthesis = () => {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel()
    }
}

// Factory function to create speech utterance
const createSpeechUtterance = (
    text: string,
    config: VoiceChatConfig,
    setState: (updater: (prev: VoiceChatState) => VoiceChatState) => void
) => {
    if (!("speechSynthesis" in window)) return null

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    utterance.onstart = () => {
        setState((prev) => ({...prev, isSpeaking: true}))
        config.onSpeakingChange?.(true)
    }

    utterance.onend = () => {
        setState((prev) => ({...prev, isSpeaking: false}))
        config.onSpeakingChange?.(false)
    }

    utterance.addEventListener("error", () => {
        setState((prev) => ({...prev, isSpeaking: false}))
        config.onSpeakingChange?.(false)
    })

    return utterance
}

// Main voice chat functions
export const toggleListening = async (
    recognition: unknown,
    state: VoiceChatState,
    config: VoiceChatConfig,
    setState: (updater: (prev: VoiceChatState) => VoiceChatState) => void
) => {
    if (!state.speechSupported || !recognition) return

    if (!state.isListening) {
        const permissionGranted = await requestMicrophonePermission()
        if (!permissionGranted) return
    }

    if (state.isListening) {
        // Stop listening
        if (recognition && typeof recognition === "object" && "stop" in recognition) {
            ;(recognition as {stop: () => void}).stop()
        }
        // Immediately update state to reflect that we're no longer listening
        setState((prev) => ({...prev, isListening: false}))
        config.onListeningChange?.(false)
    } else {
        // Start listening
        setState((prev) => ({...prev, finalTranscript: "", currentTranscript: ""}))
        config.onTranscriptChange?.("")
        if (recognition && typeof recognition === "object" && "start" in recognition) {
            ;(recognition as {start: () => void}).start()
        }
    }
}

export const speakMessage = (
    text: string,
    config: VoiceChatConfig,
    setState: (updater: (prev: VoiceChatState) => VoiceChatState) => void
) => {
    const utterance = createSpeechUtterance(text, config, setState)
    if (utterance) {
        window.speechSynthesis.speak(utterance)
    }
}

export const cleanup = (
    recognition: unknown,
    _state: VoiceChatState,
    config: VoiceChatConfig,
    setState: (updater: (prev: VoiceChatState) => VoiceChatState) => void
) => {
    if (recognition && typeof recognition === "object" && "stop" in recognition) {
        ;(recognition as {stop: () => void}).stop()
    }
    stopSpeechSynthesis()
    setState((prev) => ({
        ...prev,
        isListening: false,
        currentTranscript: "",
        finalTranscript: "",
        isSpeaking: false,
    }))
    config.onListeningChange?.(false)
    config.onTranscriptChange?.("")
    config.onSpeakingChange?.(false)
}

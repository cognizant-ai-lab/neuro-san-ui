import {
    checkSpeechSupport,
    cleanup,
    clearSilenceTimer,
    createSpeechRecognition,
    speakMessage,
    stopSpeechSynthesis,
    toggleListening,
    VoiceChatConfig,
    VoiceChatState,
} from "../../../components/AgentChat/VoiceChat"

describe("VoiceChat utils", () => {
    it("checkSpeechSupport returns a boolean", () => {
        expect(typeof checkSpeechSupport()).toBe("boolean")
    })

    it("clearSilenceTimer clears a timer", () => {
        const timers = {
            silenceTimer: setTimeout(() => {
                // Mock timer callback
            }, 1000),
        }
        clearSilenceTimer(timers)
        expect(timers.silenceTimer).toBeNull()
    })

    it("stopSpeechSynthesis does not throw", () => {
        expect(() => stopSpeechSynthesis()).not.toThrow()
    })

    it("speakMessage does not throw with minimal config", () => {
        const config: VoiceChatConfig = {
            onSendMessage: () => {
                // Mock send message callback
            },
        }
        const setState = jest.fn()
        expect(() => speakMessage("hello", config, setState)).not.toThrow()
    })
})

describe("VoiceChat advanced", () => {
    let originalSpeechRecognition: unknown
    let originalSpeechSynthesis: unknown
    let originalGetUserMedia: unknown
    let originalMediaDevices: unknown

    beforeAll(() => {
        originalSpeechRecognition = ((window as Window) && {SpeechRecognition: {}}).SpeechRecognition
        originalSpeechSynthesis = window.speechSynthesis
        originalMediaDevices = navigator.mediaDevices
        originalGetUserMedia = navigator.mediaDevices?.getUserMedia
    })
    afterAll(() => {
        ;((window as Window) && {SpeechRecognition: {}}).SpeechRecognition = originalSpeechRecognition
        window.speechSynthesis = originalSpeechSynthesis as SpeechSynthesis
        // Restore mediaDevices and getUserMedia if needed
        if (originalMediaDevices) {
            Object.defineProperty(navigator, "mediaDevices", {
                value: originalMediaDevices,
                configurable: true,
                writable: true,
            })
            // Restore getUserMedia if mediaDevices exists
            if (navigator.mediaDevices && originalGetUserMedia) {
                Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
                    value: originalGetUserMedia,
                    configurable: true,
                    writable: true,
                })
            }
        }
    })

    it("toggleListening handles permission denied", async () => {
        const state: VoiceChatState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "",
        }
        const setState = jest.fn()
        const config = {onSendMessage: jest.fn()} as VoiceChatConfig
        Object.defineProperty(navigator, "mediaDevices", {
            value: {
                getUserMedia: jest.fn().mockRejectedValue({name: "NotAllowedError"}),
            },
            configurable: true,
            writable: true,
        })
        await toggleListening({}, state, config, setState, {silenceTimer: null})
        expect(config.onSendMessage as jest.Mock).not.toHaveBeenCalled()
    })

    it("createSpeechRecognition returns undefined if not supported", () => {
        const orig = (window as unknown as {[key: string]: unknown})["SpeechRecognition"]
        Object.defineProperty(window, "SpeechRecognition", {
            value: undefined,
            configurable: true,
        })
        Object.defineProperty(window, "webkitSpeechRecognition", {
            value: undefined,
            configurable: true,
        })
        const config = {onSendMessage: jest.fn()} as VoiceChatConfig
        const setState = jest.fn()
        const timers: {silenceTimer: ReturnType<typeof setTimeout> | null} = {silenceTimer: null}
        expect(createSpeechRecognition(config, setState, timers)).toBeUndefined()
        Object.defineProperty(window, "SpeechRecognition", {
            value: orig,
            configurable: true,
        })
    })

    it("cleanup resets state and calls callbacks", () => {
        const setState = jest.fn()
        const config = {
            onSendMessage: jest.fn(),
            onTranscriptChange: jest.fn(),
            onSpeakingChange: jest.fn(),
            onListeningChange: jest.fn(),
        }
        const timers: {silenceTimer: ReturnType<typeof setTimeout> | null} = {
            silenceTimer: setTimeout(() => {
                /* mock timer */
            }, 1),
        }
        const state: VoiceChatState = {
            isListening: true,
            currentTranscript: "foo",
            speechSupported: true,
            isSpeaking: true,
            finalTranscript: "bar",
        }
        const recognition = {stop: jest.fn()}
        cleanup(recognition, state, config, setState, timers)
        expect(setState).toHaveBeenCalled()
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
        expect(config.onTranscriptChange).toHaveBeenCalledWith("")
        expect(config.onSpeakingChange).toHaveBeenCalledWith(false)
        expect(timers.silenceTimer).toBeNull()
        expect(recognition.stop).toHaveBeenCalled()
    })

    it("toggleListening starts and stops recognition", async () => {
        const state: VoiceChatState = {
            isListening: true,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "hi",
        }
        const setState = jest.fn()
        const config = {onSendMessage: jest.fn(), onTranscriptChange: jest.fn()}
        const recognition = {stop: jest.fn(), start: jest.fn()}
        const timers: {silenceTimer: ReturnType<typeof setTimeout> | null} = {silenceTimer: null}
        await toggleListening(recognition, state, config, setState, timers)
        expect(recognition.stop).toHaveBeenCalled()
        expect(config.onSendMessage).toHaveBeenCalledWith("hi")
        // Now test start
        const state2: VoiceChatState = {...state, isListening: false}
        await toggleListening(recognition, state2, config, setState, timers)
        expect(recognition.start).toHaveBeenCalled()
    })

    it("dummy test to avoid empty arrow function", () => {
        expect(true).toBe(true)
    })
})

import {
    checkSpeechSupport,
    cleanup,
    createSpeechRecognition,
    stopSpeechSynthesis,
    toggleListening,
    VoiceChatConfig,
    VoiceChatState,
} from "../../../components/AgentChat/VoiceChat"

describe("VoiceChat utils", () => {
    it("checkSpeechSupport returns a boolean", () => {
        expect(typeof checkSpeechSupport()).toBe("boolean")
    })

    it("stopSpeechSynthesis does not throw", () => {
        expect(() => stopSpeechSynthesis()).not.toThrow()
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
        await toggleListening({}, state, config, setState)
        expect(config.onSendMessage as jest.Mock).not.toHaveBeenCalled()
    })

    it("cleanup resets state and calls callbacks", () => {
        const setState = jest.fn()
        const config = {
            onSendMessage: jest.fn(),
            onTranscriptChange: jest.fn(),
            onSpeakingChange: jest.fn(),
            onListeningChange: jest.fn(),
            onProcessingChange: jest.fn(),
        }
        const state: VoiceChatState = {
            isListening: true,
            currentTranscript: "foo",
            speechSupported: true,
            isSpeaking: true,
            finalTranscript: "bar",
        }
        const recognition = {stop: jest.fn()}
        cleanup(recognition, state, config, setState)
        expect(setState).toHaveBeenCalled()
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
        expect(config.onTranscriptChange).toHaveBeenCalledWith("")
        expect(config.onSpeakingChange).toHaveBeenCalledWith(false)
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
        const config = {onSendMessage: jest.fn(), onTranscriptChange: jest.fn(), onListeningChange: jest.fn()}
        const recognition = {stop: jest.fn(), start: jest.fn()}
        await toggleListening(recognition, state, config, setState)
        expect(recognition.stop).toHaveBeenCalled()
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
        // Message sending is now handled by the onend handler, not immediately by toggleListening
        expect(config.onSendMessage).not.toHaveBeenCalled()
        // Now test start
        const state2: VoiceChatState = {...state, isListening: false}
        await toggleListening(recognition, state2, config, setState)
        expect(recognition.start).toHaveBeenCalled()
    })

    it("speech recognition onresult handles interim and final transcripts", () => {
        const config = {
            onSendMessage: jest.fn(),
            onTranscriptChange: jest.fn(),
            onProcessingChange: jest.fn(),
        }
        const setState = jest.fn()

        // Mock SpeechRecognition constructor
        const mockRecognition = {
            continuous: false,
            interimResults: false,
            lang: "",
            onstart: null as (() => void) | null,
            onresult: null as ((event: unknown) => void) | null,
            onerror: null as ((event: unknown) => void) | null,
            onend: null as (() => void) | null,
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(),
        }

        // Mock the global SpeechRecognition and ensure checkSpeechSupport returns true
        Object.defineProperty(window, "SpeechRecognition", {
            value: jest.fn(() => mockRecognition),
            configurable: true,
        })

        // Mock navigator.userAgent to ensure checkSpeechSupport returns true
        Object.defineProperty(navigator, "userAgent", {
            // eslint-disable-next-line max-len
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            configurable: true,
        })

        const recognition = createSpeechRecognition(config, setState)
        expect(recognition).toBeDefined()

        // Test interim results trigger processing state
        const interimEvent = {
            resultIndex: 0,
            results: {
                length: 1,
                0: {
                    isFinal: false,
                    0: {transcript: "hello world"},
                },
            },
        }

        mockRecognition.onresult?.(interimEvent)
        expect(config.onProcessingChange).toHaveBeenCalledWith(true)
        expect(config.onTranscriptChange).not.toHaveBeenCalled()

        // Test final results trigger transcript change and stop processing
        const finalEvent = {
            resultIndex: 0,
            results: {
                length: 1,
                0: {
                    isFinal: true,
                    0: {transcript: "hello world"},
                },
            },
        }

        mockRecognition.onresult?.(finalEvent)
        expect(config.onProcessingChange).toHaveBeenCalledWith(false)
        expect(config.onTranscriptChange).toHaveBeenCalledWith("hello world")
    })

    it("speech recognition onstart and onend update state correctly", () => {
        const config = {
            onSendMessage: jest.fn(),
            onListeningChange: jest.fn(),
        }
        // Mock setState to actually call the function it receives
        const setState = jest.fn((updater) => {
            if (typeof updater === "function") {
                const mockPrevState = {
                    isListening: false,
                    currentTranscript: "",
                    speechSupported: true,
                    isSpeaking: false,
                    finalTranscript: "",
                }
                updater(mockPrevState)
            }
        })

        // Mock SpeechRecognition constructor
        const mockRecognition = {
            continuous: false,
            interimResults: false,
            lang: "",
            onstart: null as (() => void) | null,
            onresult: null as ((event: unknown) => void) | null,
            onerror: null as ((event: unknown) => void) | null,
            onend: null as (() => void) | null,
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(),
        }

        Object.defineProperty(window, "SpeechRecognition", {
            value: jest.fn(() => mockRecognition),
            configurable: true,
        })

        // Mock navigator.userAgent to ensure checkSpeechSupport returns true
        Object.defineProperty(navigator, "userAgent", {
            // eslint-disable-next-line max-len
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            configurable: true,
        })

        createSpeechRecognition(config, setState)

        // Clear any previous calls
        config.onListeningChange.mockClear()
        setState.mockClear()

        // Test onstart
        mockRecognition.onstart?.()
        expect(setState).toHaveBeenCalledWith(expect.any(Function))
        expect(config.onListeningChange).toHaveBeenCalledWith(true)

        // Clear calls again
        config.onListeningChange.mockClear()
        setState.mockClear()

        // Test onend
        mockRecognition.onend?.()
        expect(setState).toHaveBeenCalledWith(expect.any(Function))
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
    })

    it("should handle webkit speech recognition prefix", () => {
        const config = {onSendMessage: jest.fn(), onListeningChange: jest.fn()} as VoiceChatConfig
        const setState = jest.fn()

        // Mock SpeechRecognition instance
        const mockRecognition = {
            start: jest.fn(),
            stop: jest.fn(),
            abort: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            onstart: null as (() => void) | null,
            onend: null as (() => void) | null,
            onerror: null as ((event: unknown) => void) | null,
            onresult: null as ((event: unknown) => void) | null,
        }

        // Mock navigator.userAgent to ensure checkSpeechSupport returns true
        Object.defineProperty(navigator, "userAgent", {
            // eslint-disable-next-line max-len
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            configurable: true,
        })

        // Mock window.webkitSpeechRecognition instead of SpeechRecognition
        Object.defineProperty(window, "SpeechRecognition", {
            value: undefined,
            configurable: true,
        })
        Object.defineProperty(window, "webkitSpeechRecognition", {
            value: jest.fn(() => mockRecognition),
            configurable: true,
        })

        const result = createSpeechRecognition(config, setState)

        expect((window as unknown as Record<string, unknown>)["webkitSpeechRecognition"]).toHaveBeenCalled()
        expect(result).toBe(mockRecognition)
    })

    it("should handle speech recognition errors", () => {
        const config = {onSendMessage: jest.fn(), onListeningChange: jest.fn()} as VoiceChatConfig
        const setState = jest.fn()

        // Mock SpeechRecognition instance
        const mockRecognition = {
            start: jest.fn(),
            stop: jest.fn(),
            abort: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            onstart: null as (() => void) | null,
            onend: null as (() => void) | null,
            onerror: null as ((event: unknown) => void) | null,
            onresult: null as ((event: unknown) => void) | null,
        }

        // Mock navigator.userAgent to ensure checkSpeechSupport returns true
        Object.defineProperty(navigator, "userAgent", {
            // eslint-disable-next-line max-len
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            configurable: true,
        })

        Object.defineProperty(window, "SpeechRecognition", {
            value: jest.fn(() => mockRecognition),
            configurable: true,
        })

        createSpeechRecognition(config, setState)

        // Verify addEventListener was called for error handling
        expect(mockRecognition.addEventListener).toHaveBeenCalledWith("error", expect.any(Function))

        // Get the error handler and call it
        const errorHandler = mockRecognition.addEventListener.mock.calls.find((call) => call[0] === "error")?.[1]

        expect(errorHandler).toBeDefined()
        errorHandler()
        expect(setState).toHaveBeenCalledWith(expect.any(Function))
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
    })

    it("should return undefined when speech recognition is not supported", () => {
        const config = {onSendMessage: jest.fn()} as VoiceChatConfig
        const setState = jest.fn()

        // Mock navigator.userAgent to make checkSpeechSupport return false
        Object.defineProperty(navigator, "userAgent", {
            value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/91.0",
            configurable: true,
        })

        // Remove speech recognition support
        Object.defineProperty(window, "SpeechRecognition", {
            value: undefined,
            configurable: true,
        })
        Object.defineProperty(window, "webkitSpeechRecognition", {
            value: undefined,
            configurable: true,
        })

        const result = createSpeechRecognition(config, setState)

        expect(result).toBeUndefined()
    })
})

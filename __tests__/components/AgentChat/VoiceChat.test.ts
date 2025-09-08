import {
    checkSpeechSupport,
    cleanup,
    createSpeechRecognition,
    stopSpeechSynthesis,
    toggleListening,
    VoiceChatConfig,
    VoiceChatState,
} from "../../../components/AgentChat/VoiceChat"
import {withStrictMocks} from "../../common/strictMocks"

/* eslint-disable max-len */
// User agent strings for testing
const USER_AGENTS = {
    CHROME_MAC:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
    CHROME_WINDOWS:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
    EDGE_MAC:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
    EDGE_WINDOWS:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
    FIREFOX_MAC: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0",
    FIREFOX_WINDOWS: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0",
} as const
/* eslint-enable max-len */

// Helper function to mock user agent
const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(navigator, "userAgent", {
        value: userAgent,
        configurable: true,
    })
}

// Helper function to mock Chrome browser setup
const mockChromeBrowser = () => {
    mockUserAgent(USER_AGENTS.CHROME_MAC)
}

describe("VoiceChat utils", () => {
    let originalSpeechRecognition: unknown
    let originalSpeechSynthesis: unknown
    let originalGetUserMedia: unknown
    let originalMediaDevices: unknown

    withStrictMocks()

    beforeAll(() => {
        originalSpeechRecognition = ((window as Window) && {SpeechRecognition: {}}).SpeechRecognition
        originalSpeechSynthesis = window.speechSynthesis
        originalMediaDevices = navigator.mediaDevices
        originalGetUserMedia = navigator.mediaDevices?.getUserMedia
    })

    afterAll(() => {
        ;((window as Window) && {SpeechRecognition: {}}).SpeechRecognition = originalSpeechRecognition
        // Restore speechSynthesis using defineProperty since it might be read-only
        if (originalSpeechSynthesis) {
            Object.defineProperty(window, "speechSynthesis", {
                value: originalSpeechSynthesis,
                configurable: true,
                writable: true,
            })
        }
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

    it("checkSpeechSupport returns a boolean", () => {
        expect(typeof checkSpeechSupport()).toBe("boolean")
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
            value: USER_AGENTS.CHROME_MAC,
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
            value: USER_AGENTS.CHROME_MAC,
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
            value: USER_AGENTS.CHROME_MAC,
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
            value: USER_AGENTS.CHROME_MAC,
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

    it("should return undefined when speech recognition is not supported (Edge, Firefox)", () => {
        const config = {onSendMessage: jest.fn()} as VoiceChatConfig
        const setState = jest.fn()

        const unsupportedAgents = [
            USER_AGENTS.EDGE_MAC,
            USER_AGENTS.EDGE_WINDOWS,
            USER_AGENTS.FIREFOX_MAC,
            USER_AGENTS.FIREFOX_WINDOWS,
        ]

        for (const ua of unsupportedAgents) {
            mockUserAgent(ua)
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
        }
    })

    it("checkSpeechSupport should handle browser detection for Edge, Firefox, and Chrome", () => {
        // Mock speech recognition support
        Object.defineProperty(window, "webkitSpeechRecognition", {
            value: jest.fn(),
            configurable: true,
        })

        const unsupportedAgents = [
            USER_AGENTS.EDGE_MAC,
            USER_AGENTS.EDGE_WINDOWS,
            USER_AGENTS.FIREFOX_MAC,
            USER_AGENTS.FIREFOX_WINDOWS,
        ]
        for (const ua of unsupportedAgents) {
            mockUserAgent(ua)
            expect(checkSpeechSupport()).toBe(false)
        }

        // Chrome Mac
        mockUserAgent(USER_AGENTS.CHROME_MAC)
        expect(checkSpeechSupport()).toBe(true)

        // Chrome Windows
        mockUserAgent(USER_AGENTS.CHROME_WINDOWS)
        expect(checkSpeechSupport()).toBe(true)
    })

    it("should handle microphone permission requests in Chrome", async () => {
        const state: VoiceChatState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "",
        }
        const setState = jest.fn()
        const config = {onSendMessage: jest.fn(), onListeningChange: jest.fn()} as VoiceChatConfig

        // Mock Chrome browser
        mockChromeBrowser()

        // Mock successful permission request
        const mockStream = {
            getTracks: () => [{stop: jest.fn()}],
        }
        Object.defineProperty(navigator, "mediaDevices", {
            value: {
                getUserMedia: jest.fn().mockResolvedValue(mockStream),
            },
            configurable: true,
            writable: true,
        })

        const recognition = {start: jest.fn(), stop: jest.fn()}
        await toggleListening(recognition, state, config, setState)

        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        })
        expect(recognition.start).toHaveBeenCalled()
    })

    it("should handle microphone permission errors", async () => {
        const state: VoiceChatState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "",
        }
        const setState = jest.fn()
        const config = {onSendMessage: jest.fn(), onListeningChange: jest.fn()} as VoiceChatConfig

        // Mock Chrome browser
        Object.defineProperty(navigator, "userAgent", {
            value: USER_AGENTS.CHROME_MAC,
            configurable: true,
        })

        // Mock permission denied error
        const permissionError = new Error("Permission denied")
        permissionError.name = "NotAllowedError"
        Object.defineProperty(navigator, "mediaDevices", {
            value: {
                getUserMedia: jest.fn().mockRejectedValue(permissionError),
            },
            configurable: true,
            writable: true,
        })

        const recognition = {start: jest.fn(), stop: jest.fn()}
        await toggleListening(recognition, state, config, setState)

        expect(recognition.start).not.toHaveBeenCalled()
    })

    it("should handle PermissionDeniedError", async () => {
        const state: VoiceChatState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "",
        }
        const setState = jest.fn()
        const config = {onSendMessage: jest.fn(), onListeningChange: jest.fn()} as VoiceChatConfig

        // Mock Chrome browser
        mockChromeBrowser()

        // Mock permission denied error with different name
        const permissionError = new Error("Permission denied")
        permissionError.name = "PermissionDeniedError"
        Object.defineProperty(navigator, "mediaDevices", {
            value: {
                getUserMedia: jest.fn().mockRejectedValue(permissionError),
            },
            configurable: true,
            writable: true,
        })

        const recognition = {start: jest.fn(), stop: jest.fn()}
        await toggleListening(recognition, state, config, setState)

        expect(recognition.start).not.toHaveBeenCalled()
    })

    it("should handle other getUserMedia errors gracefully", async () => {
        const state: VoiceChatState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "",
        }
        const setState = jest.fn()
        const config = {onSendMessage: jest.fn(), onListeningChange: jest.fn()} as VoiceChatConfig

        // Mock Chrome browser
        mockChromeBrowser()

        // Mock other types of errors (should not prevent recognition)
        const otherError = new Error("Some other error")
        otherError.name = "SomeOtherError"
        Object.defineProperty(navigator, "mediaDevices", {
            value: {
                getUserMedia: jest.fn().mockRejectedValue(otherError),
            },
            configurable: true,
            writable: true,
        })

        const recognition = {start: jest.fn(), stop: jest.fn()}
        await toggleListening(recognition, state, config, setState)

        expect(recognition.start).toHaveBeenCalled() // Should proceed despite other errors
    })

    it("should handle speech interruption when already speaking", () => {
        const config = {
            onSendMessage: jest.fn(),
            onSpeakingChange: jest.fn(),
            onProcessingChange: jest.fn(),
        }
        const setState = jest.fn()

        // Mock speechSynthesis
        Object.defineProperty(window, "speechSynthesis", {
            value: {
                cancel: jest.fn(),
            },
            configurable: true,
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
            value: USER_AGENTS.CHROME_MAC,
            configurable: true,
        })

        // Mock setState to return state with isSpeaking: true
        setState.mockImplementation((updater) => {
            const mockPrevState = {
                isListening: false,
                currentTranscript: "",
                speechSupported: true,
                isSpeaking: true, // This will trigger the speaking interruption logic
                finalTranscript: "",
            }
            return updater(mockPrevState)
        })

        createSpeechRecognition(config, setState)

        // Trigger onresult with a speech event
        const event = {
            resultIndex: 0,
            results: {
                length: 1,
                0: {
                    isFinal: false,
                    0: {transcript: "hello"},
                },
            },
        }

        mockRecognition.onresult?.(event)

        expect(window.speechSynthesis.cancel).toHaveBeenCalled()
        expect(config.onSpeakingChange).toHaveBeenCalledWith(false)
    })

    it("should not interrupt if not currently speaking", () => {
        const config = {
            onSendMessage: jest.fn(),
            onSpeakingChange: jest.fn(),
            onProcessingChange: jest.fn(),
        }
        const setState = jest.fn()

        // Mock speechSynthesis
        Object.defineProperty(window, "speechSynthesis", {
            value: {
                cancel: jest.fn(),
            },
            configurable: true,
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
            value: USER_AGENTS.CHROME_MAC,
            configurable: true,
        })

        // Mock setState to return state with isSpeaking: false
        setState.mockImplementation((updater) => {
            const mockPrevState = {
                isListening: false,
                currentTranscript: "",
                speechSupported: true,
                isSpeaking: false, // Not speaking, so no interruption
                finalTranscript: "",
            }
            return updater(mockPrevState)
        })

        createSpeechRecognition(config, setState)

        // Trigger onresult with a speech event
        const event = {
            resultIndex: 0,
            results: {
                length: 1,
                0: {
                    isFinal: false,
                    0: {transcript: "hello"},
                },
            },
        }

        mockRecognition.onresult?.(event)

        expect(window.speechSynthesis.cancel).not.toHaveBeenCalled()
        expect(config.onSpeakingChange).not.toHaveBeenCalled()
    })

    it("stopSpeechSynthesis calls cancel when speechSynthesis is available", () => {
        const mockCancel = jest.fn()
        Object.defineProperty(window, "speechSynthesis", {
            value: {cancel: mockCancel},
            configurable: true,
        })

        stopSpeechSynthesis()
        expect(mockCancel).toHaveBeenCalled()
    })

    it("stopSpeechSynthesis should handle missing speechSynthesis gracefully", () => {
        // Remove speechSynthesis completely to test the "in" operator
        delete (window as unknown as Record<string, unknown>)["speechSynthesis"]

        expect(() => stopSpeechSynthesis()).not.toThrow()
    })

    it("toggleListening should handle unsupported speech or missing recognition", async () => {
        const state: VoiceChatState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: false, // Not supported
            isSpeaking: false,
            finalTranscript: "",
        }
        const setState = jest.fn()
        const config = {onSendMessage: jest.fn()} as VoiceChatConfig

        await toggleListening(null, state, config, setState)

        expect(setState).not.toHaveBeenCalled()
    })

    it("toggleListening should handle missing recognition object", async () => {
        const state: VoiceChatState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "",
        }
        const setState = jest.fn()
        const config = {onSendMessage: jest.fn()} as VoiceChatConfig

        await toggleListening(null, state, config, setState) // null recognition

        expect(setState).not.toHaveBeenCalled()
    })

    it("cleanup should handle missing recognition object gracefully", () => {
        const setState = jest.fn()
        const config = {
            onSendMessage: jest.fn(),
            onTranscriptChange: jest.fn(),
            onSpeakingChange: jest.fn(),
            onListeningChange: jest.fn(),
        }
        const state: VoiceChatState = {
            isListening: true,
            currentTranscript: "foo",
            speechSupported: true,
            isSpeaking: true,
            finalTranscript: "bar",
        }

        cleanup(null, state, config, setState) // null recognition

        expect(setState).toHaveBeenCalled()
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
        expect(config.onTranscriptChange).toHaveBeenCalledWith("")
        expect(config.onSpeakingChange).toHaveBeenCalledWith(false)
    })

    it("should handle recognition onresult when speech synthesis is active", () => {
        mockChromeBrowser()

        // Mock SpeechRecognition
        const mockSpeechRecognition = jest.fn().mockImplementation(() => ({
            continuous: false,
            interimResults: false,
            lang: "en-US",
            onstart: null,
            onresult: null,
            onerror: null,
            onend: null,
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(),
        }))

        Object.defineProperty(window, "SpeechRecognition", {
            writable: true,
            value: mockSpeechRecognition,
        })
        Object.defineProperty(window, "webkitSpeechRecognition", {
            writable: true,
            value: mockSpeechRecognition,
        })

        const state: VoiceChatState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: true, // Key: speech synthesis is active
            finalTranscript: "",
        }
        const setState = jest.fn()
        const config = {
            onSendMessage: jest.fn(),
            onTranscriptChange: jest.fn(),
            onSpeakingChange: jest.fn(),
            onListeningChange: jest.fn(),
            onProcessingChange: jest.fn(),
        }

        // Mock speechSynthesis to be available
        Object.defineProperty(window, "speechSynthesis", {
            value: {cancel: jest.fn()},
            writable: true,
        })

        const recognition = createSpeechRecognition(config, setState)
        expect(recognition).toBeDefined()

        // Create an event with final transcript
        const finalEvent = {
            resultIndex: 0,
            results: {
                length: 1,
                0: {
                    isFinal: true,
                    0: {transcript: "test final transcript"},
                },
            },
        }

        // Set state to indicate speech synthesis is active
        setState.mockImplementation((updater) => {
            const newState = updater(state)
            // Should stop speech synthesis when user interrupts
            expect(newState.isSpeaking).toBe(false)
            return newState
        })

        // Trigger onresult with speech synthesis active
        recognition.onresult?.(finalEvent)

        expect(config.onSpeakingChange).toHaveBeenCalledWith(false)
        expect(config.onProcessingChange).toHaveBeenCalledWith(false)
        expect(config.onTranscriptChange).toHaveBeenCalledWith("test final transcript")
    })

    it("should handle interim transcripts with processing indicator", () => {
        mockChromeBrowser()

        // Mock SpeechRecognition
        const mockSpeechRecognition = jest.fn().mockImplementation(() => ({
            continuous: false,
            interimResults: false,
            lang: "en-US",
            onstart: null,
            onresult: null,
            onerror: null,
            onend: null,
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(),
        }))

        Object.defineProperty(window, "SpeechRecognition", {
            writable: true,
            value: mockSpeechRecognition,
        })
        Object.defineProperty(window, "webkitSpeechRecognition", {
            writable: true,
            value: mockSpeechRecognition,
        })

        const setState = jest.fn()
        const config = {
            onSendMessage: jest.fn(),
            onTranscriptChange: jest.fn(),
            onSpeakingChange: jest.fn(),
            onListeningChange: jest.fn(),
            onProcessingChange: jest.fn(),
        }

        const recognition = createSpeechRecognition(config, setState)
        expect(recognition).toBeDefined()

        // Create an event with only interim transcript (no final)
        const interimEvent = {
            resultIndex: 0,
            results: {
                length: 1,
                0: {
                    isFinal: false, // Key: not final
                    0: {transcript: "test interim"},
                },
            },
        }

        recognition.onresult?.(interimEvent)

        // Should show processing indicator for interim transcript
        expect(config.onProcessingChange).toHaveBeenCalledWith(true)
        // Should not call onTranscriptChange for interim results
        expect(config.onTranscriptChange).not.toHaveBeenCalled()
    })

    it("should handle error event through addEventListener", () => {
        mockChromeBrowser()

        // Mock SpeechRecognition
        const mockSpeechRecognition = jest.fn().mockImplementation(() => ({
            continuous: false,
            interimResults: false,
            lang: "en-US",
            onstart: null,
            onresult: null,
            onerror: null,
            onend: null,
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(),
        }))

        Object.defineProperty(window, "SpeechRecognition", {
            writable: true,
            value: mockSpeechRecognition,
        })
        Object.defineProperty(window, "webkitSpeechRecognition", {
            writable: true,
            value: mockSpeechRecognition,
        })

        const setState = jest.fn()
        const config = {
            onSendMessage: jest.fn(),
            onListeningChange: jest.fn(),
        }

        const recognition = createSpeechRecognition(config, setState)
        expect(recognition).toBeDefined()

        // Get the error event listener that was added
        expect(recognition.addEventListener).toHaveBeenCalledWith("error", expect.any(Function))

        // Extract the error callback and call it
        const errorCallback = (recognition.addEventListener as jest.Mock).mock.calls[0][1]
        errorCallback()

        expect(setState).toHaveBeenCalled()
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
    })

    it("should handle toggleListening stop path by calling setState", async () => {
        mockChromeBrowser()

        const mockSpeechRecognition = jest.fn().mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(),
            continuous: false,
            interimResults: false,
            lang: "en-US",
        }))

        Object.defineProperty(window, "SpeechRecognition", {
            writable: true,
            value: mockSpeechRecognition,
        })

        const mockRecognition = {
            start: jest.fn(),
            stop: jest.fn(),
        }

        const state: VoiceChatState = {
            isListening: true, // Currently listening, so will stop
            currentTranscript: "test",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "final",
        }

        // Create a mock setState that actually executes the updater function
        const setState = jest.fn().mockImplementation((updater) => {
            const newState = updater(state)
            expect(newState.isListening).toBe(false)
            return newState
        })

        const config = {
            onSendMessage: jest.fn(),
            onListeningChange: jest.fn(),
        }

        await toggleListening(mockRecognition, state, config, setState)

        // Should call setState to update isListening to false
        expect(setState).toHaveBeenCalledWith(expect.any(Function))
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
    })

    it("should handle toggleListening start path by calling setState", async () => {
        mockChromeBrowser()

        // Mock navigator.mediaDevices for permission success
        Object.defineProperty(navigator, "mediaDevices", {
            value: {
                getUserMedia: jest.fn().mockResolvedValue({
                    getTracks: () => [{stop: jest.fn()}],
                }),
            },
            writable: true,
        })

        const mockSpeechRecognition = jest.fn().mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(),
            continuous: false,
            interimResults: false,
            lang: "en-US",
        }))

        Object.defineProperty(window, "SpeechRecognition", {
            writable: true,
            value: mockSpeechRecognition,
        })

        const mockRecognition = {
            start: jest.fn(),
            stop: jest.fn(),
        }

        const state: VoiceChatState = {
            isListening: false, // Not listening, so will start
            currentTranscript: "test",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "final",
        }

        // Create a mock setState that actually executes the updater function
        const setState = jest.fn().mockImplementation((updater) => {
            const newState = updater(state)
            expect(newState.finalTranscript).toBe("")
            expect(newState.currentTranscript).toBe("")
            return newState
        })

        const config = {
            onSendMessage: jest.fn(),
            onListeningChange: jest.fn(),
        }

        await toggleListening(mockRecognition, state, config, setState)

        // Should call setState to clear transcripts when starting
        expect(setState).toHaveBeenCalledWith(expect.any(Function))
        expect(mockRecognition.start).toHaveBeenCalled()
    })

    it("should handle cleanup setState function call", () => {
        const mockRecognition = {
            stop: jest.fn(),
        }

        const state: VoiceChatState = {
            isListening: true,
            currentTranscript: "test",
            speechSupported: true,
            isSpeaking: true,
            finalTranscript: "final",
        }

        // Create a mock setState that actually executes the updater function
        const setState = jest.fn().mockImplementation((updater) => {
            const newState = updater(state)
            expect(newState.isListening).toBe(false)
            expect(newState.currentTranscript).toBe("")
            expect(newState.finalTranscript).toBe("")
            expect(newState.isSpeaking).toBe(false)
            return newState
        })

        const config = {
            onSendMessage: jest.fn(),
            onListeningChange: jest.fn(),
            onTranscriptChange: jest.fn(),
            onSpeakingChange: jest.fn(),
        }

        cleanup(mockRecognition, state, config, setState)

        // Should call setState to reset all voice chat state
        expect(setState).toHaveBeenCalledWith(expect.any(Function))
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
        expect(config.onTranscriptChange).toHaveBeenCalledWith("")
        expect(config.onSpeakingChange).toHaveBeenCalledWith(false)
    })

    it("should handle addEventListener error callback when triggered", () => {
        mockChromeBrowser()

        const mockSpeechRecognition = jest.fn().mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(),
            continuous: false,
            interimResults: false,
            lang: "en-US",
        }))

        Object.defineProperty(window, "SpeechRecognition", {
            writable: true,
            value: mockSpeechRecognition,
        })

        const prevState: VoiceChatState = {
            isListening: true,
            currentTranscript: "test",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "final",
        }

        // Create a mock setState that actually executes the updater function
        const setState = jest.fn().mockImplementation((updater) => {
            const newState = updater(prevState)
            expect(newState.isListening).toBe(false)
            return newState
        })

        const config = {
            onSendMessage: jest.fn(),
            onListeningChange: jest.fn(),
        }

        const recognition = createSpeechRecognition(config, setState)
        expect(recognition).toBeDefined()

        // Get the addEventListener calls to find the error callback
        const mockAddEventListener = recognition.addEventListener as jest.Mock
        expect(mockAddEventListener).toHaveBeenCalledWith("error", expect.any(Function))

        // Get the error callback function and call it
        const errorCallback = mockAddEventListener.mock.calls[0][1]
        errorCallback()

        // Should call setState to set isListening to false
        expect(setState).toHaveBeenCalledWith(expect.any(Function))
        expect(config.onListeningChange).toHaveBeenCalledWith(false)
    })
})

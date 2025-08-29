import {
    checkSpeechSupport,
    cleanup,
    createSpeechRecognition,
    stopSpeechSynthesis,
    toggleListening,
    VoiceChatConfig,
    VoiceChatState,
} from "../../../components/AgentChat/VoiceChat"

// User agent strings for testing
const USER_AGENTS = {
    CHROME_MAC:
        // eslint-disable-next-line max-len
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    CHROME_WINDOWS:
        // eslint-disable-next-line max-len
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    EDGE_MODERN:
        // eslint-disable-next-line max-len
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59",
    EDGE_LEGACY:
        // eslint-disable-next-line max-len
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edge/91.0.864.59",
    FIREFOX_LINUX: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/91.0",
    CHROME_UNKNOWN: "Mozilla/5.0 (Unknown) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
} as const

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

    it("should return undefined when speech recognition is not supported", () => {
        const config = {onSendMessage: jest.fn()} as VoiceChatConfig
        const setState = jest.fn()

        // Mock navigator.userAgent to make checkSpeechSupport return false
        mockUserAgent(USER_AGENTS.FIREFOX_LINUX)

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

    it("checkSpeechSupport should handle Edge browser detection", () => {
        // Mock Edge browser user agent (contains both Chrome and Edg)
        mockUserAgent(USER_AGENTS.EDGE_MODERN)

        // Mock speech recognition support
        Object.defineProperty(window, "webkitSpeechRecognition", {
            value: jest.fn(),
            configurable: true,
        })

        const result = checkSpeechSupport()
        // The regex is !/Edge/u.test() which looks for "Edge" but Edge userAgent has "Edg"
        // So we need to test with the string that actually contains "Edge"
        expect(result).toBe(true) // Should return true because the userAgent contains "Edg" not "Edge"
    })

    it("checkSpeechSupport should handle actual Edge browser string", () => {
        // Mock Edge browser with actual "Edge" string
        mockUserAgent(USER_AGENTS.EDGE_LEGACY)

        // Mock speech recognition support
        Object.defineProperty(window, "webkitSpeechRecognition", {
            value: jest.fn(),
            configurable: true,
        })

        const result = checkSpeechSupport()
        expect(result).toBe(false) // Should return false for Edge because regex excludes "Edge"
    })

    it("checkSpeechSupport should handle Windows detection", () => {
        // Mock Chrome on Windows user agent
        mockUserAgent(USER_AGENTS.CHROME_WINDOWS)

        // Mock speech recognition support
        Object.defineProperty(window, "webkitSpeechRecognition", {
            value: jest.fn(),
            configurable: true,
        })

        const result = checkSpeechSupport()
        expect(result).toBe(true) // Should return true for Chrome on Windows
    })

    it("checkSpeechSupport should handle platform property for Mac detection", () => {
        // Mock navigator with platform property
        mockUserAgent(USER_AGENTS.CHROME_UNKNOWN)
        Object.defineProperty(navigator, "platform", {
            value: "MacIntel",
            configurable: true,
        })

        // Mock speech recognition support
        Object.defineProperty(window, "webkitSpeechRecognition", {
            value: jest.fn(),
            configurable: true,
        })

        const result = checkSpeechSupport()
        expect(result).toBe(true) // Should return true for Chrome on Mac
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
})

import {USER_AGENTS} from "../../../../../../__tests__/common/UserAgentTestUtils"
import {checkSpeechSupport, toggleListening} from "../../../../components/AgentChat/VoiceChat/VoiceChat"

const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(navigator, "userAgent", {
        value: userAgent,
        configurable: true,
    })
}

const mockChromeBrowser = () => {
    mockUserAgent(USER_AGENTS.CHROME_MAC)
}

// Suppress React 18 render warning during hook tests
let errorSpy: jest.SpyInstance
let originalSpeechRecognition: unknown
let originalGetUserMedia: unknown
let originalMediaDevices: unknown

beforeAll(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn())
    originalSpeechRecognition = ((window as Window) && {SpeechRecognition: {}}).SpeechRecognition
    originalMediaDevices = navigator.mediaDevices
    originalGetUserMedia = navigator.mediaDevices?.getUserMedia
})

afterAll(() => {
    errorSpy.mockRestore()
    ;((window as Window) && {SpeechRecognition: {}}).SpeechRecognition = originalSpeechRecognition
    if (originalMediaDevices) {
        Object.defineProperty(navigator, "mediaDevices", {
            value: originalMediaDevices,
            configurable: true,
            writable: true,
        })
        if (navigator.mediaDevices && originalGetUserMedia) {
            Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
                value: originalGetUserMedia,
                configurable: true,
                writable: true,
            })
        }
    }
})

describe("VoiceChat utils", () => {
    describe("Browser Support", () => {
        beforeEach(() => {
            // Reset SpeechRecognition before each test
            Object.defineProperty(window, "SpeechRecognition", {
                value: jest.fn(),
                configurable: true,
                writable: true,
            })
            mockUserAgent(USER_AGENTS.CHROME_MAC)
        })

        it("checkSpeechSupport returns a boolean", () => {
            expect(typeof checkSpeechSupport()).toBe("boolean")
        })

        it("detects Chrome and non-Chrome browsers", () => {
            mockUserAgent(USER_AGENTS.CHROME_MAC)
            expect(checkSpeechSupport()).toBe(true)
            mockUserAgent(USER_AGENTS.FIREFOX_MAC)
            expect(checkSpeechSupport()).toBe(false)
            mockUserAgent(USER_AGENTS.EDGE_WINDOWS)
            expect(checkSpeechSupport()).toBe(false)
            mockUserAgent(USER_AGENTS.EDGE_MAC)
            expect(checkSpeechSupport()).toBe(false)
        })

        it("returns false if SpeechRecognition is missing", () => {
            mockUserAgent(USER_AGENTS.CHROME_MAC)
            delete (window as unknown as Record<string, unknown>)["SpeechRecognition"]
            expect("SpeechRecognition" in window).toBe(false)
            expect(checkSpeechSupport()).toBe(false)
        })

        it("should return false when SpeechRecognition API is missing", () => {
            // Mock Chrome browser
            mockChromeBrowser()

            // Remove SpeechRecognition API
            delete (window as unknown as Record<string, unknown>)["SpeechRecognition"]

            expect(checkSpeechSupport()).toBe(false)
        })
    })

    describe("Permission and State Handling", () => {
        it("toggleListening handles permission denied", async () => {
            // Mock Chrome browser
            mockChromeBrowser()

            // Create a proper error object
            const permissionError = new Error("Permission denied")
            permissionError.name = "NotAllowedError"

            Object.defineProperty(navigator, "mediaDevices", {
                value: {
                    getUserMedia: jest.fn().mockRejectedValue(permissionError),
                },
                configurable: true,
                writable: true,
            })

            const mockRecognition = {start: jest.fn(), stop: jest.fn()}
            await toggleListening(true, mockRecognition as unknown as SpeechRecognition)
            expect(mockRecognition.start).not.toHaveBeenCalled()
        })

        it("toggleListening starts and stops recognition", async () => {
            // Mock Chrome browser for this test
            mockChromeBrowser()

            const recognition = {stop: jest.fn(), start: jest.fn()}

            // Test stopping recognition (shouldStartListening = false)
            await toggleListening(false, recognition as unknown as SpeechRecognition)
            expect(recognition.stop).toHaveBeenCalled()

            // Mock successful permission for starting
            Object.defineProperty(navigator, "mediaDevices", {
                value: {
                    getUserMedia: jest.fn().mockResolvedValue({
                        getTracks: () => [{stop: jest.fn()}],
                    }),
                },
                configurable: true,
                writable: true,
            })

            // Test starting recognition (shouldStartListening = true)
            await toggleListening(true, recognition as unknown as SpeechRecognition)
            expect(recognition.start).toHaveBeenCalled()
        })
    })

    describe("Microphone Permission Handling", () => {
        it("should handle microphone permission requests in Chrome", async () => {
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
            await toggleListening(true, recognition as unknown as SpeechRecognition)

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
            // Mock Chrome browser
            mockChromeBrowser()

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
            await toggleListening(true, recognition as unknown as SpeechRecognition)

            expect(recognition.start).not.toHaveBeenCalled()
        })

        it("should handle PermissionDeniedError", async () => {
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
            await toggleListening(true, recognition as unknown as SpeechRecognition)

            expect(recognition.start).not.toHaveBeenCalled()
        })

        it("should handle other getUserMedia errors gracefully", async () => {
            // Mock Chrome browser
            mockChromeBrowser()

            // Mock other types of errors (should not prevent recognition if Chrome supports it)
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
            await toggleListening(true, recognition as unknown as SpeechRecognition)

            // Should still try to start recognition since it's Chrome and error is not permission-related
            expect(recognition.start).toHaveBeenCalled()
        })
    })
})

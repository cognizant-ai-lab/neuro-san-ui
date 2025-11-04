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

import type {Dispatch, MutableRefObject, SetStateAction} from "react"

import {USER_AGENTS} from "../../../../../../__tests__/common/UserAgentTestUtils"
import {
    checkSpeechSupport,
    cleanupAndStopSpeechRecognition,
    setupSpeechRecognition,
    SpeechRecognitionHandlers,
    SpeechRecognitionState,
    toggleListening,
} from "../../../../components/AgentChat/VoiceChat/VoiceChat"

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

    describe("Speech Recognition Event Handlers", () => {
        let mockSetChatInput: jest.MockedFunction<Dispatch<SetStateAction<string>>>
        let mockSetVoiceInputState: jest.MockedFunction<Dispatch<SetStateAction<SpeechRecognitionState>>>
        let speechRecognitionRef: MutableRefObject<SpeechRecognition | null>

        beforeEach(() => {
            mockSetChatInput = jest.fn()
            mockSetVoiceInputState = jest.fn()
            speechRecognitionRef = {current: null}

            // Mock SpeechRecognition constructor
            const MockSpeechRecognition = jest.fn().mockImplementation(() => ({
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                start: jest.fn(),
                stop: jest.fn(),
                continuous: true,
                interimResults: true,
                lang: "en-US",
            }))

            Object.defineProperty(window, "SpeechRecognition", {
                value: MockSpeechRecognition,
                configurable: true,
                writable: true,
            })

            mockChromeBrowser()
        })

        it("should handle recognition start event", () => {
            const handlers = setupSpeechRecognition(mockSetChatInput, mockSetVoiceInputState, speechRecognitionRef)
            expect(handlers).not.toBeNull()

            // Call the start handler
            handlers.start()

            expect(mockSetVoiceInputState).toHaveBeenCalledWith(expect.any(Function))
            const updateFn = mockSetVoiceInputState.mock.calls[0][0] as (
                prev: SpeechRecognitionState
            ) => SpeechRecognitionState
            const prevState: SpeechRecognitionState = {
                currentTranscript: "old",
                finalTranscript: "final",
                isListening: false,
                isProcessingSpeech: true,
            }
            const newState = updateFn(prevState)
            expect(newState).toEqual({
                currentTranscript: "",
                finalTranscript: "final",
                isListening: true,
                isProcessingSpeech: true,
            })
        })

        it("should handle recognition end event", () => {
            const handlers = setupSpeechRecognition(mockSetChatInput, mockSetVoiceInputState, speechRecognitionRef)
            expect(handlers).not.toBeNull()

            // Call the end handler
            handlers.end()

            expect(mockSetVoiceInputState).toHaveBeenCalledWith(expect.any(Function))
            const updateFn = mockSetVoiceInputState.mock.calls[0][0] as (
                prev: SpeechRecognitionState
            ) => SpeechRecognitionState
            const prevState: SpeechRecognitionState = {
                currentTranscript: "current",
                finalTranscript: "final",
                isListening: true,
                isProcessingSpeech: true,
            }
            const newState = updateFn(prevState)
            expect(newState).toEqual({
                currentTranscript: "current",
                finalTranscript: "final",
                isListening: false,
                isProcessingSpeech: false,
            })
        })

        it("should handle recognition result event with final results", () => {
            const handlers = setupSpeechRecognition(mockSetChatInput, mockSetVoiceInputState, speechRecognitionRef)
            expect(handlers).not.toBeNull()

            // Mock speech recognition result event
            const mockEvent = {
                resultIndex: 0,
                results: [
                    {
                        isFinal: true,
                        0: {transcript: "Hello world"},
                    },
                    {
                        isFinal: false,
                        0: {transcript: "how are"},
                    },
                ],
            } as unknown as SpeechRecognitionEvent

            // Call the result handler
            handlers.result(mockEvent)

            // First for the result, second for final transcript processing
            expect(mockSetVoiceInputState).toHaveBeenCalledTimes(2)

            // Check the first call (result processing)
            const firstUpdateFn = mockSetVoiceInputState.mock.calls[0][0] as (
                prev: SpeechRecognitionState
            ) => SpeechRecognitionState
            const prevState: SpeechRecognitionState = {
                currentTranscript: "",
                finalTranscript: "",
                isListening: true,
                isProcessingSpeech: false,
            }
            const newState = firstUpdateFn(prevState)
            expect(newState).toEqual({
                currentTranscript: "how are",
                finalTranscript: "Hello world",
                isListening: true,
                isProcessingSpeech: true,
            })

            // Check that setChatInput was called with a function
            expect(mockSetChatInput).toHaveBeenCalledWith(expect.any(Function))
            const chatInputFn = mockSetChatInput.mock.calls[0][0] as (prev: string) => string
            expect(chatInputFn("previous text")).toBe("previous text Hello world")
            expect(chatInputFn("previous text ")).toBe("previous text Hello world")
            expect(chatInputFn("")).toBe("Hello world")
        })

        it("should handle recognition result event with only interim results", () => {
            const handlers = setupSpeechRecognition(mockSetChatInput, mockSetVoiceInputState, speechRecognitionRef)
            expect(handlers).not.toBeNull()

            // Mock speech recognition result event with only interim results
            const mockEvent = {
                resultIndex: 0,
                results: [
                    {
                        isFinal: false,
                        0: {transcript: "Hello"},
                    },
                    {
                        isFinal: false,
                        0: {transcript: " world"},
                    },
                ],
            } as unknown as SpeechRecognitionEvent

            // Call the result handler
            handlers.result(mockEvent)

            expect(mockSetVoiceInputState).toHaveBeenCalledWith(expect.any(Function))
            const updateFn = mockSetVoiceInputState.mock.calls[0][0] as (
                prev: SpeechRecognitionState
            ) => SpeechRecognitionState
            const prevState: SpeechRecognitionState = {
                currentTranscript: "",
                finalTranscript: "",
                isListening: true,
                isProcessingSpeech: false,
            }
            const newState = updateFn(prevState)
            expect(newState).toEqual({
                currentTranscript: "Hello world",
                finalTranscript: "",
                isListening: true,
                isProcessingSpeech: true,
            })

            expect(mockSetChatInput).not.toHaveBeenCalled()
        })

        it("should handle recognition error event", () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn())

            const handlers = setupSpeechRecognition(mockSetChatInput, mockSetVoiceInputState, speechRecognitionRef)
            expect(handlers).not.toBeNull()

            // Mock speech recognition error event
            const mockErrorEvent = {
                error: "network",
            } as unknown as SpeechRecognitionErrorEvent

            // Call the error handler
            handlers.error(mockErrorEvent)

            expect(consoleErrorSpy).toHaveBeenCalledWith("Speech recognition error:", "network")

            expect(mockSetVoiceInputState).toHaveBeenCalledWith(expect.any(Function))
            const updateFn = mockSetVoiceInputState.mock.calls[0][0] as (
                prev: SpeechRecognitionState
            ) => SpeechRecognitionState
            const prevState: SpeechRecognitionState = {
                currentTranscript: "current",
                finalTranscript: "final",
                isListening: true,
                isProcessingSpeech: true,
            }
            const newState = updateFn(prevState)
            expect(newState).toEqual({
                currentTranscript: "current",
                finalTranscript: "final",
                isListening: false,
                isProcessingSpeech: false,
            })

            consoleErrorSpy.mockRestore()
        })

        it("should return null when speech recognition is not supported", () => {
            // Mock non-Chrome browser
            mockUserAgent(USER_AGENTS.FIREFOX_MAC)

            const handlers = setupSpeechRecognition(mockSetChatInput, mockSetVoiceInputState, speechRecognitionRef)
            expect(handlers).toBeNull()
            expect(speechRecognitionRef.current).toBeNull()
        })
    })

    describe("cleanupAndStopSpeechRecognition", () => {
        it("should cleanup and stop speech recognition", () => {
            const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn())

            const mockSpeechRecognition = {
                removeEventListener: jest.fn(),
                stop: jest.fn(),
            }

            const speechRecognitionRef = {current: mockSpeechRecognition as unknown as SpeechRecognition}
            const handlers = {
                start: jest.fn(),
                end: jest.fn(),
                error: jest.fn(),
                result: jest.fn(),
            }

            cleanupAndStopSpeechRecognition(speechRecognitionRef, handlers)

            expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledTimes(4)
            expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith("start", handlers.start)
            expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith("end", handlers.end)
            expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith("error", handlers.error)
            expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith("result", handlers.result)
            expect(mockSpeechRecognition.stop).toHaveBeenCalled()
            expect(speechRecognitionRef.current).toBeNull()

            consoleWarnSpy.mockRestore()
        })

        it("should handle stop errors gracefully", () => {
            const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(jest.fn())

            const mockSpeechRecognition = {
                removeEventListener: jest.fn(),
                stop: jest.fn().mockImplementation(() => {
                    throw new Error("Stop failed")
                }),
            }

            const speechRecognitionRef = {current: mockSpeechRecognition as unknown as SpeechRecognition}
            const handlers = {
                start: jest.fn(),
                end: jest.fn(),
                error: jest.fn(),
                result: jest.fn(),
            }

            cleanupAndStopSpeechRecognition(speechRecognitionRef, handlers)

            expect(consoleWarnSpy).toHaveBeenCalledWith("Error stopping speechRecognition:", expect.any(Error))
            expect(speechRecognitionRef.current).toBeNull()

            consoleWarnSpy.mockRestore()
        })

        it("should handle null speech recognition gracefully", () => {
            const speechRecognitionRef: MutableRefObject<SpeechRecognition | null> = {current: null}
            const handlers: SpeechRecognitionHandlers | null = null

            expect(() => {
                cleanupAndStopSpeechRecognition(speechRecognitionRef, handlers)
            }).not.toThrow()
        })
    })
})

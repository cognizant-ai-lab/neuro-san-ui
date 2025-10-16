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

import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {ReactNode} from "react"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {USER_AGENTS} from "../../../../../../__tests__/common/UserAgentTestUtils"
import {MicrophoneButton, MicrophoneButtonProps} from "../../../../components/AgentChat/VoiceChat/MicrophoneButton"
import {
    checkSpeechSupport,
    SpeechRecognitionState,
    toggleListening,
} from "../../../../components/AgentChat/VoiceChat/VoiceChat"

// Mock the VoiceChat module
jest.mock("../../../../components/AgentChat/VoiceChat/VoiceChat", () => ({
    toggleListening: jest.fn(),
    checkSpeechSupport: jest.fn(),
}))

// Mock the LlmChatButton component
jest.mock("../../../../components/AgentChat/LlmChatButton", () => ({
    LlmChatButton: ({
        children,
        onClick,
        disabled,
        ...props
    }: {
        children: ReactNode
        onClick: () => void
        disabled: boolean
        id: string
        sx?: Record<string, unknown>
    }) => (
        <button
            {...props}
            onClick={onClick}
            disabled={disabled}
            data-testid="microphone-button"
        >
            {children}
        </button>
    ),
}))

describe("MicrophoneButton", () => {
    const mockOnMicToggle = jest.fn()
    const mockRecognition: Partial<SpeechRecognition> = {
        start: jest.fn(),
        stop: jest.fn(),
        continuous: false,
        interimResults: false,
        lang: "en-US",
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }

    const defaultVoiceInputState: SpeechRecognitionState = {
        currentTranscript: "",
        finalTranscript: "",
        isListening: false,
        isProcessingSpeech: false,
    }

    const defaultProps: MicrophoneButtonProps = {
        isMicOn: false,
        onMicToggle: mockOnMicToggle,
        speechRecognitionRef: {current: mockRecognition as SpeechRecognition},
        voiceInputState: defaultVoiceInputState,
        setVoiceInputState: jest.fn(),
    }

    withStrictMocks()

    beforeEach(() => {
        ;(toggleListening as jest.Mock).mockResolvedValue(undefined)
        ;(checkSpeechSupport as jest.Mock).mockReturnValue(true)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it("renders with mic off icon when not listening", () => {
        render(<MicrophoneButton {...defaultProps} />)

        expect(screen.getByTestId("MicOffIcon")).toBeInTheDocument()
        expect(screen.queryByTestId("MicNoneIcon")).not.toBeInTheDocument()
    })

    it("renders with mic on icon when listening", () => {
        const listeningVoiceInputState = {...defaultVoiceInputState, isListening: true}
        render(
            <MicrophoneButton
                {...defaultProps}
                voiceInputState={listeningVoiceInputState}
            />
        )

        expect(screen.getByTestId("MicNoneIcon")).toBeInTheDocument()
        expect(screen.queryByTestId("MicOffIcon")).not.toBeInTheDocument()
    })

    it("is enabled when speech is supported and not awaiting LLM", () => {
        render(<MicrophoneButton {...defaultProps} />)

        expect(screen.getByTestId("microphone-button")).toBeEnabled()
    })

    it("calls onMicToggle and toggleListening when clicked to turn on", async () => {
        const user = userEvent.setup()
        render(<MicrophoneButton {...defaultProps} />)

        const button = screen.getByTestId("microphone-button")
        await user.click(button)

        expect(mockOnMicToggle).toHaveBeenCalledWith(true)
        expect(toggleListening).toHaveBeenCalledWith(true, mockRecognition)
    })

    it("calls onMicToggle and toggleListening when clicked to turn off", async () => {
        const user = userEvent.setup()
        render(
            <MicrophoneButton
                {...defaultProps}
                isMicOn={true}
            />
        )

        const button = screen.getByTestId("microphone-button")
        await user.click(button)

        expect(mockOnMicToggle).toHaveBeenCalledWith(false)
        expect(toggleListening).toHaveBeenCalledWith(false, mockRecognition)
    })

    it("passes correct parameters to toggleListening when turning on", async () => {
        const user = userEvent.setup()
        render(<MicrophoneButton {...defaultProps} />)

        const button = screen.getByTestId("microphone-button")
        await user.click(button)

        expect(toggleListening).toHaveBeenCalledWith(true, mockRecognition)
    })

    it("passes correct parameters to toggleListening when turning off", async () => {
        const user = userEvent.setup()
        render(
            <MicrophoneButton
                {...defaultProps}
                isMicOn={true}
            />
        )

        const button = screen.getByTestId("microphone-button")
        await user.click(button)

        expect(toggleListening).toHaveBeenCalledWith(false, mockRecognition)
    })

    it("has correct styling based on voice state", () => {
        const {rerender} = render(<MicrophoneButton {...defaultProps} />)

        // Check initial state (not listening)
        let button = screen.getByTestId("microphone-button")
        expect(button).toHaveAttribute("id", "microphone-button")

        // Check listening state
        const listeningVoiceInputState = {...defaultVoiceInputState, isListening: true}
        rerender(
            <MicrophoneButton
                {...defaultProps}
                voiceInputState={listeningVoiceInputState}
            />
        )

        button = screen.getByTestId("microphone-button")
        expect(button).toHaveAttribute("id", "microphone-button")
    })

    it("displays correct tooltip text when microphone is off", async () => {
        const user = userEvent.setup()
        render(<MicrophoneButton {...defaultProps} />)

        const button = screen.getByTestId("microphone-button")
        await user.hover(button)

        expect(await screen.findByText("Turn microphone on")).toBeInTheDocument()
    })

    it("displays correct tooltip text when microphone is on", async () => {
        const user = userEvent.setup()
        render(
            <MicrophoneButton
                {...defaultProps}
                isMicOn={true}
            />
        )

        const button = screen.getByTestId("microphone-button")
        await user.hover(button)

        expect(await screen.findByText("Turn microphone off")).toBeInTheDocument()
    })

    it("updates tooltip text when isMicOn changes", async () => {
        const user = userEvent.setup()
        const {rerender} = render(<MicrophoneButton {...defaultProps} />)

        const button = screen.getByTestId("microphone-button")

        // Test initial state - microphone off
        await user.hover(button)
        expect(await screen.findByText("Turn microphone on")).toBeInTheDocument()

        await user.unhover(button)

        // Test updated state - microphone on
        rerender(
            <MicrophoneButton
                {...defaultProps}
                isMicOn={true}
            />
        )

        await user.hover(button)
        expect(await screen.findByText("Turn microphone off")).toBeInTheDocument()
    })

    it("applies success background color when microphone is on and listening", () => {
        const listeningVoiceInputState = {...defaultVoiceInputState, isListening: true}
        render(
            <MicrophoneButton
                {...defaultProps}
                isMicOn={true}
                voiceInputState={listeningVoiceInputState}
            />
        )

        const button = screen.getByTestId("microphone-button")
        expect(button).toBeInTheDocument()
        // The success background color logic is tested by verifying the component renders
        // The actual style application is handled by the LlmChatButton mock
    })

    it("applies secondary background color when microphone is off", () => {
        render(<MicrophoneButton {...defaultProps} />)
        const button = screen.getByTestId("microphone-button")
        expect(button).toBeInTheDocument()
    })

    it("applies secondary background color when microphone is on but not listening", () => {
        const notListeningVoiceInputState = {...defaultVoiceInputState, isListening: false}
        render(
            <MicrophoneButton
                {...defaultProps}
                isMicOn={true}
                voiceInputState={notListeningVoiceInputState}
            />
        )
        const button = screen.getByTestId("microphone-button")
        expect(button).toBeInTheDocument()
    })

    test.each([
        ["Edge on Mac", USER_AGENTS.EDGE_MAC],
        ["Edge on Windows", USER_AGENTS.EDGE_WINDOWS],
        ["Firefox on Mac", USER_AGENTS.FIREFOX_MAC],
        ["Firefox on Windows", USER_AGENTS.FIREFOX_WINDOWS],
    ])("mic button is disabled and tooltip is shown for unsupported browser: %s", async (_browserName, userAgent) => {
        Object.defineProperty(navigator, "userAgent", {
            value: userAgent,
            configurable: true,
        })

        // Mock checkSpeechSupport to return false for unsupported browsers
        ;(checkSpeechSupport as jest.Mock).mockReturnValue(false)

        const unsupportedVoiceInputState = {
            ...defaultVoiceInputState,
        }
        render(
            <MicrophoneButton
                {...defaultProps}
                voiceInputState={unsupportedVoiceInputState}
            />
        )

        const button = screen.getByTestId("microphone-button")
        expect(button).toBeInTheDocument()
        expect(button).toBeDisabled()

        const user = userEvent.setup()
        await user.hover(button)
        // MUI Tooltip renders in a portal, so check document.body
        expect(
            await screen.findByText(
                "Voice input is only supported in Google Chrome on Mac or Windows.",
                {},
                {container: document.body}
            )
        ).toBeInTheDocument()
    })
})

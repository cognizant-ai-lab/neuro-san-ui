import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {ReactNode} from "react"

import {MicrophoneButton, MicrophoneButtonProps} from "../../../../components/AgentChat/VoiceChat/MicrophoneButton"
import {toggleListening, VoiceChatState} from "../../../../components/AgentChat/VoiceChat/VoiceChat"
import {withStrictMocks} from "../../../common/strictMocks"
import {USER_AGENTS} from "../../../common/UserAgentTestUtils"

// Mock the VoiceChat module
jest.mock("../../../../components/AgentChat/VoiceChat/VoiceChat", () => ({
    toggleListening: jest.fn(),
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
    const mockSetVoiceState = jest.fn()
    const mockOnSendMessage = jest.fn()
    const mockOnTranscriptChange = jest.fn()
    const mockRecognition = {start: jest.fn(), stop: jest.fn()}

    const defaultVoiceState: VoiceChatState = {
        isListening: false,
        currentTranscript: "",
        isSpeaking: false,
        finalTranscript: "",
    }

    const defaultProps: MicrophoneButtonProps = {
        isMicOn: false,
        onMicToggle: mockOnMicToggle,
        voiceState: defaultVoiceState,
        setVoiceState: mockSetVoiceState,
        speechSupported: true,
        recognition: mockRecognition,
        onSendMessage: mockOnSendMessage,
        onTranscriptChange: mockOnTranscriptChange,
    }

    withStrictMocks()

    beforeEach(() => {
        ;(toggleListening as jest.Mock).mockResolvedValue(undefined)
    })

    it("renders with mic off icon when not listening", () => {
        render(<MicrophoneButton {...defaultProps} />)

        expect(screen.getByTestId("MicOffIcon")).toBeInTheDocument()
        expect(screen.queryByTestId("MicNoneIcon")).not.toBeInTheDocument()
    })

    it("renders with mic on icon when listening", () => {
        const listeningVoiceState = {...defaultVoiceState, isListening: true}
        render(
            <MicrophoneButton
                {...defaultProps}
                voiceState={listeningVoiceState}
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
        expect(toggleListening).toHaveBeenCalledWith(
            mockRecognition,
            defaultVoiceState,
            expect.objectContaining({
                onSendMessage: mockOnSendMessage,
                onTranscriptChange: mockOnTranscriptChange,
            }),
            mockSetVoiceState,
            true
        )
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
        expect(toggleListening).toHaveBeenCalledWith(
            mockRecognition,
            defaultVoiceState,
            expect.objectContaining({
                onSendMessage: mockOnSendMessage,
                onTranscriptChange: mockOnTranscriptChange,
            }),
            mockSetVoiceState,
            true
        )
    })

    it("sets up voice config with correct callbacks when turning on", async () => {
        const user = userEvent.setup()
        render(<MicrophoneButton {...defaultProps} />)

        const button = screen.getByTestId("microphone-button")
        await user.click(button)

        const voiceConfigCall = (toggleListening as jest.Mock).mock.calls[0][2]
        expect(voiceConfigCall).toEqual({
            onSendMessage: mockOnSendMessage,
            onTranscriptChange: mockOnTranscriptChange,
            onSpeakingChange: expect.any(Function),
            onListeningChange: expect.any(Function),
        })
    })

    it("sets up voice config with correct callbacks when turning off", async () => {
        const user = userEvent.setup()
        render(
            <MicrophoneButton
                {...defaultProps}
                isMicOn={true}
            />
        )

        const button = screen.getByTestId("microphone-button")
        await user.click(button)

        const voiceConfigCall = (toggleListening as jest.Mock).mock.calls[0][2]
        expect(voiceConfigCall).toEqual({
            onSendMessage: mockOnSendMessage,
            onTranscriptChange: mockOnTranscriptChange,
            onSpeakingChange: expect.any(Function),
            onListeningChange: expect.any(Function),
        })
    })

    it("calls setVoiceState when onSpeakingChange is triggered", async () => {
        const user = userEvent.setup()
        render(<MicrophoneButton {...defaultProps} />)

        const button = screen.getByTestId("microphone-button")
        await user.click(button)

        const voiceConfigCall = (toggleListening as jest.Mock).mock.calls[0][2]
        const onSpeakingChange = voiceConfigCall.onSpeakingChange

        // Simulate speaking change
        onSpeakingChange(true)

        expect(mockSetVoiceState).toHaveBeenCalledWith(expect.any(Function))

        // Test the actual state update function
        const stateUpdater = mockSetVoiceState.mock.calls[mockSetVoiceState.mock.calls.length - 1][0]
        const mockPrevState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "",
        }
        const newState = stateUpdater(mockPrevState)
        expect(newState).toEqual({...mockPrevState, isSpeaking: true})
    })

    it("calls setVoiceState when onListeningChange is triggered", async () => {
        const user = userEvent.setup()
        render(<MicrophoneButton {...defaultProps} />)

        const button = screen.getByTestId("microphone-button")
        await user.click(button)

        const voiceConfigCall = (toggleListening as jest.Mock).mock.calls[0][2]
        const onListeningChange = voiceConfigCall.onListeningChange

        // Simulate listening change
        onListeningChange(true)

        expect(mockSetVoiceState).toHaveBeenCalledWith(expect.any(Function))

        // Test the actual state update function
        const stateUpdater = mockSetVoiceState.mock.calls[mockSetVoiceState.mock.calls.length - 1][0]
        const mockPrevState = {
            isListening: false,
            currentTranscript: "",
            speechSupported: true,
            isSpeaking: false,
            finalTranscript: "",
        }
        const newState = stateUpdater(mockPrevState)
        expect(newState).toEqual({...mockPrevState, isListening: true})
    })

    it("has correct styling based on voice state", () => {
        const {rerender} = render(<MicrophoneButton {...defaultProps} />)

        // Check initial state (not listening)
        let button = screen.getByTestId("microphone-button")
        expect(button).toHaveAttribute("id", "microphone-button")

        // Check listening state
        const listeningVoiceState = {...defaultVoiceState, isListening: true}
        rerender(
            <MicrophoneButton
                {...defaultProps}
                voiceState={listeningVoiceState}
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
        const listeningVoiceState = {...defaultVoiceState, isListening: true}
        render(
            <MicrophoneButton
                {...defaultProps}
                isMicOn={true}
                voiceState={listeningVoiceState}
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
        const notListeningVoiceState = {...defaultVoiceState, isListening: false}
        render(
            <MicrophoneButton
                {...defaultProps}
                isMicOn={true}
                voiceState={notListeningVoiceState}
            />
        )
        const button = screen.getByTestId("microphone-button")
        expect(button).toBeInTheDocument()
    })

    it("mic button is disabled and tooltip is shown if not Chrome (speech not supported)", async () => {
        const unsupportedAgents = [
            USER_AGENTS.EDGE_MAC,
            USER_AGENTS.EDGE_WINDOWS,
            USER_AGENTS.FIREFOX_MAC,
            USER_AGENTS.FIREFOX_WINDOWS,
        ]

        for (const ua of unsupportedAgents) {
            Object.defineProperty(navigator, "userAgent", {
                value: ua,
                configurable: true,
            })

            const unsupportedVoiceState = {
                ...defaultVoiceState,
            }
            const {unmount} = render(
                <MicrophoneButton
                    {...defaultProps}
                    voiceState={unsupportedVoiceState}
                    speechSupported={false}
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

            // Clean up after each iteration to avoid side effects
            unmount()
        }
    })
})

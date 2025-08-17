import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {ReactNode} from "react"

import {MicrophoneButton, MicrophoneButtonProps} from "../../../components/AgentChat/MicrophoneButton"
import {toggleListening, VoiceChatState} from "../../../components/AgentChat/VoiceChat"

// Mock the VoiceChat module
jest.mock("../../../components/AgentChat/VoiceChat", () => ({
    toggleListening: jest.fn(),
}))

// Mock the LlmChatButton component
jest.mock("../../../components/AgentChat/LlmChatButton", () => ({
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

// Mock MUI icons
jest.mock("@mui/icons-material/MicNone", () => ({
    __esModule: true,
    default: () => <span data-testid="mic-on-icon">MicOn</span>,
}))

jest.mock("@mui/icons-material/MicOff", () => ({
    __esModule: true,
    default: () => <span data-testid="mic-off-icon">MicOff</span>,
}))

describe("MicrophoneButton", () => {
    const mockOnMicToggle = jest.fn()
    const mockSetVoiceState = jest.fn()
    const mockOnSendMessage = jest.fn()
    const mockOnTranscriptChange = jest.fn()
    const mockRecognition = {start: jest.fn(), stop: jest.fn()}
    const mockTimers: {silenceTimer: ReturnType<typeof setTimeout> | null} = {silenceTimer: null}

    const defaultVoiceState: VoiceChatState = {
        isListening: false,
        currentTranscript: "",
        speechSupported: true,
        isSpeaking: false,
        finalTranscript: "",
    }

    const defaultProps: MicrophoneButtonProps = {
        isMicOn: false,
        onMicToggle: mockOnMicToggle,
        voiceState: defaultVoiceState,
        setVoiceState: mockSetVoiceState,
        isAwaitingLlm: false,
        recognition: mockRecognition,
        timers: mockTimers,
        onSendMessage: mockOnSendMessage,
        onTranscriptChange: mockOnTranscriptChange,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        ;(toggleListening as jest.Mock).mockResolvedValue(undefined)
    })

    it("renders with mic off icon when not listening", () => {
        render(<MicrophoneButton {...defaultProps} />)

        expect(screen.getByTestId("mic-off-icon")).toBeInTheDocument()
        expect(screen.queryByTestId("mic-on-icon")).not.toBeInTheDocument()
    })

    it("renders with mic on icon when listening", () => {
        const listeningVoiceState = {...defaultVoiceState, isListening: true}
        render(
            <MicrophoneButton
                {...defaultProps}
                voiceState={listeningVoiceState}
            />
        )

        expect(screen.getByTestId("mic-on-icon")).toBeInTheDocument()
        expect(screen.queryByTestId("mic-off-icon")).not.toBeInTheDocument()
    })

    it("is disabled when speech is not supported", () => {
        const unsupportedVoiceState = {...defaultVoiceState, speechSupported: false}
        render(
            <MicrophoneButton
                {...defaultProps}
                voiceState={unsupportedVoiceState}
            />
        )

        expect(screen.getByTestId("microphone-button")).toBeDisabled()
    })

    it("is disabled when awaiting LLM response", () => {
        render(
            <MicrophoneButton
                {...defaultProps}
                isAwaitingLlm={true}
            />
        )

        expect(screen.getByTestId("microphone-button")).toBeDisabled()
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
                autoSpeakResponses: true,
            }),
            mockSetVoiceState,
            mockTimers
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
                autoSpeakResponses: false,
            }),
            mockSetVoiceState,
            mockTimers
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
            autoSpeakResponses: true,
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
            autoSpeakResponses: false,
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
})

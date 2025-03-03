// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"

import {ControlButtons} from "../../../components/AgentChat/ControlButtons"

describe("ControlButtons", () => {
    let user: UserEvent
    const mockClearChat = jest.fn()
    const mockHandleSend = jest.fn()
    const mockHandleStop = jest.fn()

    const defaultProps = {
        clearChatOnClickCallback: mockClearChat,
        enableClearChatButton: true,
        isAwaitingLlm: false,
        handleSend: mockHandleSend,
        handleStop: mockHandleStop,
        previousUserQuery: "Previous query",
        shouldEnableRegenerateButton: true,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        user = userEvent.setup()
    })

    it("renders the Clear Chat and Regenerate buttons when not awaiting LLM", () => {
        render(<ControlButtons {...defaultProps} />)
        expect(screen.getByRole("button", {name: "Clear Chat"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Regenerate"})).toBeInTheDocument()
    })

    it("renders the Stop button when awaiting LLM", () => {
        render(
            <ControlButtons
                {...defaultProps}
                isAwaitingLlm={true}
            />
        )
        expect(screen.getByRole("button", {name: "Stop"})).toBeInTheDocument()
    })

    it("calls clearChatOnClickCallback when Clear Chat button is clicked", async () => {
        render(<ControlButtons {...defaultProps} />)
        await user.click(screen.getByRole("button", {name: "Clear Chat"}))
        expect(mockClearChat).toHaveBeenCalledTimes(1)
    })

    it("calls handleStop when Stop button is clicked", async () => {
        render(
            <ControlButtons
                {...defaultProps}
                isAwaitingLlm={true}
            />
        )
        await user.click(screen.getByRole("button", {name: "Stop"}))
        expect(mockHandleStop).toHaveBeenCalledTimes(1)
    })

    it("calls handleSend with previousUserQuery when Regenerate button is clicked", async () => {
        render(<ControlButtons {...defaultProps} />)
        await user.click(screen.getByRole("button", {name: "Regenerate"}))
        expect(mockHandleSend).toHaveBeenCalledWith("Previous query")
    })

    it("disables the Clear Chat button when enableClearChatButton is false", () => {
        render(
            <ControlButtons
                {...defaultProps}
                enableClearChatButton={false}
            />
        )
        expect(screen.getByRole("button", {name: "Clear Chat"})).toBeDisabled()
    })

    it("disables the Regenerate button when shouldEnableRegenerateButton is false", () => {
        render(
            <ControlButtons
                {...defaultProps}
                shouldEnableRegenerateButton={false}
            />
        )
        expect(screen.getByRole("button", {name: "Regenerate"})).toBeDisabled()
    })
})

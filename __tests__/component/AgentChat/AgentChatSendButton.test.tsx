// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"

import {AgentChatSendButton} from "../../../components/AgentChat/AgentChatSendButton"

describe("AgentChatSendButton", () => {
    let user: UserEvent
    const handleClick = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        user = userEvent.setup()
    })

    it("renders button with correct attributes", () => {
        render(
            <AgentChatSendButton
                enableSendButton={true}
                id="test-button"
                onClickCallback={handleClick}
            />
        )

        const button = screen.getByRole("button", {name: "Send"})
        expect(button).toBeInTheDocument()
        expect(button).not.toBeDisabled()
    })

    it("disables button when enableSendButton is false", () => {
        render(
            <AgentChatSendButton
                enableSendButton={false}
                id="test-button"
                onClickCallback={handleClick}
            />
        )

        const button = screen.getByRole("button", {name: "Send"})
        expect(button).toBeDisabled()
    })

    it("calls onClickCallback when clicked", async () => {
        render(
            <AgentChatSendButton
                enableSendButton={true}
                id="test-button"
                onClickCallback={handleClick}
            />
        )

        const button = screen.getByRole("button", {name: "Send"})
        await user.click(button)
        expect(handleClick).toHaveBeenCalledTimes(1)
    })
})

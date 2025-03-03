// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"

import {SendButton} from "../../../components/AgentChat/SendButton"

describe("SendButton", () => {
    let user: UserEvent
    const handleClick = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        user = userEvent.setup()
    })

    it("renders button with correct attributes", () => {
        render(
            <SendButton
                enableSendButton={true}
                id="test-button"
                onClickCallback={handleClick}
            />
        )

        const button = screen.getByRole("button", {name: "Send"})
        expect(button).toBeInTheDocument()
        expect(button).toBeEnabled()
    })

    it("disables button when enableSendButton is false", () => {
        render(
            <SendButton
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
            <SendButton
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

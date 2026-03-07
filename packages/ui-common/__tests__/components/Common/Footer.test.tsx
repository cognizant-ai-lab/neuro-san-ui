import {render, screen, within} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {Footer} from "../../../components/Common/Footer"
import * as Nav from "../../../utils/BrowserNavigation"

describe("Footer", () => {
    withStrictMocks()

    it("Renders correctly", () => {
        render(
            <Footer
                logoLinkUrl="www.example.com/"
                logoUrl="/logo.svg"
                supportEmailAddress="test@example.com"
            />
        )

        // Check for headers in the footer (as it were)
        screen.getByText("Team")
        screen.getByText("Services")
        screen.getByText("Other")

        // Couple of known menu items
        screen.getByText("About")
        screen.getByText("Contact Us")
    })

    it("Handles Contact Us click", async () => {
        const supportEmailAddress = "test@example.com"

        render(
            <Footer
                supportEmailAddress={supportEmailAddress}
                logoUrl="/logo.svg"
                logoLinkUrl="www.example.com"
            />
        )

        const contactUsLink = screen.getByText("Contact Us")
        expect(contactUsLink).toBeInTheDocument()

        const user: UserEvent = userEvent.setup()

        // Simulate click
        await user.click(contactUsLink)

        // Check if the email dialog appears
        const emailDialog = screen.getByTestId("email-dialog-confirm-main")

        // Check if the dialog has the correct content
        within(emailDialog).getByText("Contact Us")
        within(emailDialog).getByText(new RegExp(supportEmailAddress, "u"))

        const navigationSpy = jest.spyOn(Nav, "navigateToUrl").mockImplementation(() => undefined)

        // Simulate clicking the Confirm button
        const confirmButton = within(emailDialog).getByText("Confirm")
        await user.click(confirmButton)

        expect(navigationSpy).toHaveBeenCalledWith(`mailto:${supportEmailAddress}`)

        // Dialog should close after clicking Confirm
        expect(screen.queryByTestId("email-dialog-confirm-main")).not.toBeInTheDocument()

        navigationSpy.mockClear()

        // Display dialog again
        await user.click(contactUsLink)

        // Simulate clicking the Cancel button
        const cancelButton = within(screen.getByTestId("email-dialog-confirm-main")).getByText("Cancel")
        await user.click(cancelButton)

        // Dialog should close after clicking Cancel
        expect(screen.queryByTestId("email-dialog-confirm-main")).not.toBeInTheDocument()
        expect(navigationSpy).not.toHaveBeenCalled()
    })
})

// eslint-disable-next-line no-shadow
import {render, screen, waitFor} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {MUIAlert} from "../../components/MUIAlert"

describe("MUIAlert Component", () => {
    const DefaultMUIAlert = (
        <MUIAlert
            id="test-alert"
            severity="error"
        >
            Test Alert Message
        </MUIAlert>
    )

    const CloseableMUIAlert = (
        <MUIAlert
            closeable={true}
            id="test-alert"
            severity="error"
        >
            Test Alert Message
        </MUIAlert>
    )

    it("should render the alert with given props", () => {
        render(DefaultMUIAlert)
        expect(screen.getByText("Test Alert Message")).toBeInTheDocument()
        expect(screen.queryByRole("button", {name: /close/iu})).not.toBeInTheDocument()
    })

    it("should show close button when closeable is true and close the alert when close button is clicked", async () => {
        const user = userEvent.setup()
        render(CloseableMUIAlert)

        const closeButton = screen.getByRole("button", {name: /close/iu})
        await user.click(closeButton)
        await waitFor(() => {
            expect(screen.queryByText("Test Alert Message")).not.toBeVisible()
        })
    })
})

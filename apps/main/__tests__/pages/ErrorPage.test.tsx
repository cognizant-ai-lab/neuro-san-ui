import {render, screen, waitFor} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"

import ErrorPage from "../../../../packages/ui-common/components/ErrorPage/ErrorPage"
import {LOGO} from "@cognizant-ai-lab/ui-common/const"
import {smartSignOut, useAuthentication} from "../../../../packages/ui-common/utils/Authentication"
import {withStrictMocks} from "../../../../__tests__/common/strictMocks"

jest.mock("next-auth/react", () => ({
    useSession: () => ({
        status: "authenticated",
    }),
}))

jest.mock("next/router", () => ({
    useRouter() {
        return {
            pathname: "",
            query: {
                someValue: 42,
            },
        }
    },
}))

jest.mock("../../../../packages/ui-common/utils/Authentication")
const mockSmartSignOut = jest.mocked(smartSignOut, {shallow: true})

describe("ErrorPage", () => {
    withStrictMocks()

    let user: UserEvent

    beforeEach(() => {
        user = userEvent.setup()
        jest.mocked(useAuthentication, {shallow: true}).mockReturnValue({
            data: {user: {name: "mock-user", image: "mock-image-url"}},
        })
    })

    it("Should render correctly", async () => {
        render(
            <ErrorPage
                id="test-error-page"
                errorText="Error page for testing"
            />
        )

        await screen.findByText(new RegExp(LOGO, "u"))
    })

    it("Should handle sign out correctly", async () => {
        render(
            <ErrorPage
                id="test-error-page"
                errorText="Error page for testing"
            />
        )

        // Locate sign out button and click it
        const userDropdownToggle = await screen.findByRole("button", {name: "User dropdown toggle"})
        await user.click(userDropdownToggle)

        const signOut = await screen.findByText("Sign out")
        await user.click(signOut)

        await waitFor(() => expect(mockSmartSignOut).toHaveBeenCalled())
    })
})

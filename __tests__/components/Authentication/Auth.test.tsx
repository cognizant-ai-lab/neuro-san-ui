import {render, screen} from "@testing-library/react"
import {SessionContextValue, signIn, useSession} from "next-auth/react"

import {Auth} from "../../../components/Authentication/Auth"
import {withStrictMocks} from "../../common/strictMocks"

const AUTH_CHILDREN_TEXT = "Mock Auth"

const AUTH_ELEMENT = (
    <Auth>
        <div>{AUTH_CHILDREN_TEXT}</div>
    </Auth>
)

// Note: next-auth/react has its own mock under __mocks__/next-auth/react.js so we don't need to mock here.
describe("Auth Component", () => {
    withStrictMocks()

    it("should render a spinner when status is loading", () => {
        ;(useSession as jest.Mock).mockReturnValue({status: "loading"} as SessionContextValue)
        render(AUTH_ELEMENT)

        expect(screen.getByText("Loading... Please wait")).toBeInTheDocument()
    })

    it("should call signIn when user is not authenticated", () => {
        ;(useSession as jest.Mock).mockReturnValue({data: {session: {user: undefined}}} as SessionContextValue)
        render(AUTH_ELEMENT)

        expect(signIn).toHaveBeenCalledWith("auth0")
    })

    it("should pass through children when user is authenticated", async () => {
        ;(useSession as jest.Mock).mockReturnValue({
            data: {user: {name: "Test User", email: "test@example.com"}},
            status: "authenticated",
        } as SessionContextValue)
        render(AUTH_ELEMENT)

        expect(signIn).not.toHaveBeenCalled()
        await screen.findByText(AUTH_CHILDREN_TEXT)
    })
})

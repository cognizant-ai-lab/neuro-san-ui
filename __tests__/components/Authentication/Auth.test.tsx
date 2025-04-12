import {render, screen} from "@testing-library/react"
import {SessionContextValue, useSession} from "next-auth/react"

import {Auth} from "../../../components/Authentication/auth"

jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn().mockImplementation(() => ({})),
        signIn: jest.fn(),
    }
})

const mockedUseSession = jest.mocked(useSession)
describe("Auth Component", () => {
    const renderMockAuth = () => (
        <Auth>
            <div>Mock Auth</div>
        </Auth>
    )

    it("should render a spinner when status is loading", () => {
        mockedUseSession.mockReturnValue({status: "loading"} as SessionContextValue)
        const view = renderMockAuth()
        render(view)

        expect(screen.getByText("Loading... Please wait")).toBeInTheDocument()
    })
})

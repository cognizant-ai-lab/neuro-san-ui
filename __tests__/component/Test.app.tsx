// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"

import {LOGO} from "../../const"
import LEAF from "../../pages/_app"
import {mockFetch} from "../testUtils"

// mock next/router
jest.mock("next/router", () => ({
    useRouter() {
        return {
            route: "/projects",
            pathname: "",
            asPath: "",
            push: jest.fn(),
            events: {
                on: jest.fn(),
                off: jest.fn(),
            },
            beforePopState: jest.fn(() => null),
            prefetch: jest.fn(() => null),
            isReady: true,
            query: {
                projectID: "1",
                experimentID: "1",
                runID: "1",
                prescriptorID: "1",
            },
        }
    },
}))

describe("Main App Component", () => {
    it("Should render correctly", () => {
        console.error = jest.fn()

        const oldFetch = window.fetch
        window.fetch = mockFetch({
            backendApiUrl: "dummyURL",
            auth0ClientId: "dummyClientId",
            auth0Domain: "dummyDomain",
            supportEmailAddress: "test@example.com",
            oidcHeaderFound: true,
            username: "testUser",
        })

        render(
            // The name has been all upper forever. Refactor someday.
            // eslint-disable-next-line react/jsx-pascal-case
            <LEAF
                Component={() => <div>Test Component to Render</div>}
                pageProps={{url: "TestComponentURL", session: {user: {}}}}
            />
        )

        expect(screen.getByText(LOGO)).toBeInTheDocument()

        window.fetch = oldFetch
    })
})

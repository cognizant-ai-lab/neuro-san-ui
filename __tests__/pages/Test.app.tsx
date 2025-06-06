import {render, screen} from "@testing-library/react"

import {LOGO} from "../../const"
import NeuroAI from "../../pages/_app"
import {withStrictMocks} from "../common/strictMocks"
import {mockFetch} from "../testUtils"

const originalFetch = window.fetch

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
    withStrictMocks()

    beforeEach(() => {
        window.fetch = mockFetch({
            backendApiUrl: "dummyURL",
            backendNeuroSanApiUrl: "dummyNeuroSanURL",
            auth0ClientId: "dummyClientId",
            auth0Domain: "dummyDomain",
            supportEmailAddress: "test@example.com",
            oidcHeaderFound: true,
            username: "testUser",
        })
    })

    afterEach(() => {
        window.fetch = originalFetch
    })

    it("Should render correctly", async () => {
        render(
            <NeuroAI
                Component={() => <div>Test Component to Render</div>}
                pageProps={{url: "TestComponentURL", session: {user: {}}}}
                router={jest.requireMock("next/router").useRouter()}
            />
        )

        await screen.findByText(new RegExp(LOGO, "u"))
    })
})

import {render, screen} from "@testing-library/react"
import {ReactNode} from "react"

import {LOGO} from "../../const"
import NeuroSanUI from "../../pages/_app"
import * as Authentication from "../../utils/Authentication"
import {withStrictMocks} from "../common/strictMocks"
import {mockFetch} from "../common/testUtils"

const originalFetch = window.fetch

jest.mock("next-auth/react", () => ({
    SessionProvider: ({children}: {children: ReactNode}) => <>{children}</>,
}))

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
            backendNeuroSanApiUrl: "dummyNeuroSanURL",
            auth0ClientId: "dummyClientId",
            auth0Domain: "dummyDomain",
            supportEmailAddress: "test@example.com",
            oidcHeaderFound: true,
            username: "testUser",
        })

        jest.spyOn(Authentication, "useAuthentication").mockReturnValue({
            data: {user: {name: "mock-user", image: "mock-image-url"}},
        })
    })

    afterEach(() => {
        window.fetch = originalFetch
    })

    it("Should render correctly", async () => {
        render(
            <NeuroSanUI
                Component={() => <div>Test Component to Render</div>}
                pageProps={{url: "TestComponentURL", session: {user: {}}}}
                router={jest.requireMock("next/router").useRouter()}
            />
        )

        await screen.findByText(new RegExp(LOGO, "u"))
    })
})

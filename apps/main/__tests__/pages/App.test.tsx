import {render, screen, waitFor} from "@testing-library/react"
import {ReactNode} from "react"

import {withStrictMocks} from "../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../__tests__/common/TestUtils"
import {useAuthentication} from "../../../../packages/ui-common"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/environment"
import NeuroSanUI from "../../pages/_app"

const originalFetch = window.fetch

const COMPONENT_BODY = "Test Component to Render"

jest.mock("next-auth/react", () => ({
    SessionProvider: ({children}: {children: ReactNode}) => <>{children}</>,
}))

jest.mock("../../../../packages/ui-common/const", () => ({
    ENABLE_AUTHENTICATION: true,
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
            beforePopState: jest.fn((): null => null),
            prefetch: jest.fn((): null => null),
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

jest.mock("../../../../packages/ui-common", () => ({
    ...jest.requireActual("../../../../packages/ui-common"),
    useAuthentication: jest.fn(),
}))

const APP_COMPONENT = (
    <NeuroSanUI
        Component={() => <div>{COMPONENT_BODY}</div>}
        pageProps={{url: "TestComponentURL", session: {user: {}}}}
        router={jest.requireMock("next/router").useRouter()}
    />
)

describe("Main App Component", () => {
    withStrictMocks()

    const testNeuroSanURL = "testNeuroSanURL"
    const testClientId = "testClientId"
    const testDomain = "testDomain"
    const testSupportEmailAddress = "test@example.com"
    beforeEach(() => {
        ;(useAuthentication as jest.Mock).mockReturnValue({
            data: {user: {name: "mock-user", image: "mock-image-url"}},
        })

        // Clear and reset the zustand store before each test
        useEnvironmentStore.setState({
            backendNeuroSanApiUrl: null,
            auth0ClientId: null,
            auth0Domain: null,
            supportEmailAddress: null,
        })
    })

    afterEach(() => {
        window.fetch = originalFetch
    })

    it("Should render correctly", async () => {
        window.fetch = mockFetch({
            backendNeuroSanApiUrl: testNeuroSanURL,
            auth0ClientId: testClientId,
            auth0Domain: testDomain,
            supportEmailAddress: testSupportEmailAddress,
            oidcHeaderFound: true,
            username: "testUser",
        })

        render(APP_COMPONENT)

        await screen.findByText(COMPONENT_BODY)

        // Assert that values were set in the zustand store
        const state = useEnvironmentStore.getState()
        expect(state.backendNeuroSanApiUrl).toBe(testNeuroSanURL)
        expect(state.auth0ClientId).toBe(testClientId)
        expect(state.auth0Domain).toBe(testDomain)
        expect(state.supportEmailAddress).toBe(testSupportEmailAddress)
    })

    it("Should handle failure to fetch environment variables", async () => {
        // We're expecting console errors due to the failed fetch
        const consoleSpy = jest.spyOn(console, "error").mockImplementation()

        // Mock fetch to return an error
        window.fetch = mockFetch({error: "Network Error"}, false)

        render(APP_COMPONENT)

        // Assert that values were not set in the zustand store
        await waitFor(() => {
            expect(useEnvironmentStore.getState().backendNeuroSanApiUrl).toBe(null)
        })

        const state = useEnvironmentStore.getState()
        expect(state.auth0ClientId).toBe(null)
        expect(state.auth0Domain).toBe(null)
        expect(state.supportEmailAddress).toBe(null)

        expect(consoleSpy).toHaveBeenCalledTimes(2)

        // Both fetches should have failed
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to fetch environment variables"))
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to fetch user info"))
    })
})

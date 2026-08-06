/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import type {EnvironmentResponse} from "../../pages/api/environment/Types"
import {render, screen, waitFor} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"
import {NextRouter, Router, useRouter} from "next/router"
import {ReactNode} from "react"

import {withStrictMocks} from "../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../__tests__/common/TestUtils"
import {TRIGGER_APP_TOUR_EVENT_NAME} from "../../../../packages/ui-common/components/MultiAgentAccelerator/const"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/Environment"
import {useAuthentication} from "../../../../packages/ui-common/utils/Authentication"
import {NeuroSanUI} from "../../pages/_app"

//#region Constants
const originalFetch = window.fetch

const COMPONENT_BODY = "Test Component to Render"

const createMockRouter = (overrides: Partial<NextRouter> = {}): NextRouter => ({
    asPath: undefined,
    back: undefined,
    basePath: undefined,
    beforePopState: undefined,
    events: undefined,
    forward: undefined,
    isFallback: undefined,
    isLocaleDomain: false,
    isPreview: undefined,
    isReady: undefined,
    prefetch: undefined,
    push: undefined,
    query: undefined,
    reload: undefined,
    replace: undefined,
    route: undefined,
    pathname: "/projects",

    ...overrides,
})

const APP_COMPONENT = (
    <NeuroSanUI
        Component={() => <div>{COMPONENT_BODY}</div>}
        pageProps={{url: "TestComponentURL", session: {user: {}}}}
        router={createMockRouter() as unknown as Router}
    />
)

//#endregion Constants

//#region Mocks

vi.mock("next-auth/react", () => ({
    SessionProvider: ({children}: {children: ReactNode}) => <>{children}</>,
}))

vi.mock("../../../../packages/ui-common/const")

vi.mock("next/router", () => ({
    useRouter: vi.fn(),
}))

vi.mock("../../../../packages/ui-common/utils/Authentication", async () => {
    const actual = await vi.importActual<typeof import("../../../../packages/ui-common/utils/Authentication")>(
        "../../../../packages/ui-common/utils/Authentication"
    )

    return {
        ...actual,
        useAuthentication: vi.fn(),
    }
})

//#endregion Mocks

describe("Main App Component", () => {
    withStrictMocks()

    let user: UserEvent

    const testNeuroSanURL = "testNeuroSanURL"
    const testClientId = "testClientId"
    const testDomain = "testDomain"
    const testSupportEmailAddress = "test@example.com"
    const testLogoServiceToken = "testLogoServiceToken"

    const mockEnvironment = (enableAuthentication: boolean | undefined) =>
        ({
            auth0ClientId: testClientId,
            auth0Domain: testDomain,
            backendNeuroSanApiUrl: testNeuroSanURL,
            enableAuthentication,
            logoServiceToken: testLogoServiceToken,
            supportEmailAddress: testSupportEmailAddress,
        }) satisfies EnvironmentResponse

    beforeEach(() => {
        vi.mocked(useAuthentication).mockReturnValue({
            data: {user: {name: "mock-user", image: "mock-image-url"}},
        })

        // Clear and reset the zustand store before each test
        useEnvironmentStore.setState({
            enableAuthentication: null,
            backendNeuroSanApiUrl: null,
            auth0ClientId: null,
            auth0Domain: null,
            supportEmailAddress: null,
            logoServiceToken: null,
        })

        user = userEvent.setup()
        window.fetch = mockFetch(mockEnvironment(true))
        vi.mocked(useRouter).mockReturnValue(createMockRouter())
    })

    afterEach(() => {
        window.fetch = originalFetch
    })

    it.each([false, true])("should render the page with darkMode=%s", async (darkMode) => {
        render(APP_COMPONENT)

        await screen.findByText(COMPONENT_BODY)

        const darkModeButton = await screen.findByTestId("DarkModeIcon")

        if (darkMode) {
            // Set MUI dark mode
            await user.click(darkModeButton)
        }

        // Assert that dark mode was applied or not, as appropriate
        expect(darkModeButton).toHaveStyle({color: darkMode ? "var(--bs-yellow)" : "var(--bs-gray-dark)"})

        // Assert that values were set in the zustand store
        const state = useEnvironmentStore.getState()
        expect(state.backendNeuroSanApiUrl).toBe(testNeuroSanURL)
        expect(state.auth0ClientId).toBe(testClientId)
        expect(state.auth0Domain).toBe(testDomain)
        expect(state.supportEmailAddress).toBe(testSupportEmailAddress)
        expect(state.logoServiceToken).toBe(testLogoServiceToken)
    })

    it("Should render correctly when authentication is disabled", async () => {
        window.fetch = mockFetch(mockEnvironment(false))

        render(APP_COMPONENT)

        await screen.findByText(COMPONENT_BODY)

        // No authentication so values should be defaults
        const state = useEnvironmentStore.getState()
        expect(state.backendNeuroSanApiUrl).toBe(testNeuroSanURL)
        expect(state.auth0ClientId).toBe("")
        expect(state.auth0Domain).toBe("")
        expect(state.supportEmailAddress).toBe(testSupportEmailAddress)
        expect(state.logoServiceToken).toBe(testLogoServiceToken)
    })

    // This is the case where we haven't yet retrieved the environment variables, so we don't know if authentication
    // is enabled or not.
    it("Should render correctly when authentication is undefined", async () => {
        window.fetch = mockFetch(mockEnvironment(undefined))

        render(APP_COMPONENT)

        await waitFor(() => {
            const loadingSpinner = document.getElementById("loading-header")
            expect(loadingSpinner).toBeInTheDocument()
        })
    })

    it("Should handle failure to fetch environment variables", async () => {
        // We're expecting console errors due to the failed fetch
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn())

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
        expect(state.logoServiceToken).toBe(null)

        expect(consoleSpy).toHaveBeenCalledTimes(1)

        // Both fetches should have failed
        expect(consoleSpy).toHaveBeenCalledExactlyOnceWith(
            expect.stringContaining("Failed to fetch environment variables")
        )
    })

    it("Should handle failure to fetch user info", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn())

        window.fetch = vi
            .fn()
            // First fetch: /api/environment succeeds
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue(mockEnvironment(true)),
            })
            // Second fetch: /api/userInfo fails via !res.ok
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: "Network Error",
                json: vi.fn().mockResolvedValue({error: "Network Error"}),
            })

        render(APP_COMPONENT)

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("Failed to fetch user info"))
        })

        expect(consoleSpy).toHaveBeenCalledTimes(1)
    })

    it("Should render the splash page correctly", async () => {
        vi.mocked(useRouter).mockReturnValue(
            createMockRouter({
                pathname: "/",
                route: "/",
                asPath: "/",
            })
        )

        render(APP_COMPONENT)

        await screen.findByText(COMPONENT_BODY)
        expect(document.getElementById("body-div")).toBeInTheDocument()
    })

    it("Should launch the tour when the items is selected from the Help menu", async () => {
        render(APP_COMPONENT)
        await screen.findByText(COMPONENT_BODY)

        const dispatchSpy = vi.spyOn(window, "dispatchEvent")

        // Simulate clicking on the Help menu to open it
        await user.click(await screen.findByText("Help"))

        // Locate "take a tour" item
        const takeTourItem = await screen.findByText("Take a tour")

        await user.click(takeTourItem)

        // Make sure we dispatched the correct event to trigger the tour. The actual tour is tested elsewhere.
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: TRIGGER_APP_TOUR_EVENT_NAME,
            })
        )
    })
})

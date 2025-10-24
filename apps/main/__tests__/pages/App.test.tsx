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

import {authenticationEnabled, DEFAULT_NEURO_SAN_SERVER_URL} from "@cognizant-ai-lab/ui-common/const"
import {render, screen, waitFor} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {useRouter} from "next/router"
import {ReactNode} from "react"

import {withStrictMocks} from "../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../__tests__/common/TestUtils"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/environment"
import {useAuthentication} from "../../../../packages/ui-common/utils/Authentication"
import NeuroSanUI from "../../pages/_app"

const originalFetch = window.fetch

const COMPONENT_BODY = "Test Component to Render"

jest.mock("next-auth/react", () => ({
    SessionProvider: ({children}: {children: ReactNode}) => <>{children}</>,
}))

jest.mock("../../../../packages/ui-common/const")

jest.mock("next/router", () => ({
    useRouter: jest.fn(),
}))

jest.mock("../../../../packages/ui-common/utils/Authentication")

const APP_COMPONENT = (
    <NeuroSanUI
        Component={() => <div>{COMPONENT_BODY}</div>}
        pageProps={{url: "TestComponentURL", session: {user: {}}}}
        router={jest.requireMock("next/router").useRouter()}
    />
)

describe("Main App Component", () => {
    withStrictMocks()

    let user: UserEvent

    const testNeuroSanURL = "testNeuroSanURL"
    const testClientId = "testClientId"
    const testDomain = "testDomain"
    const testSupportEmailAddress = "test@example.com"
    beforeEach(() => {
        ;(useAuthentication as jest.Mock).mockReturnValue({
            data: {user: {name: "mock-user", image: "mock-image-url"}},
        })
        ;(authenticationEnabled as jest.Mock).mockReturnValue(true)

        // Clear and reset the zustand store before each test
        useEnvironmentStore.setState({
            backendNeuroSanApiUrl: null,
            auth0ClientId: null,
            auth0Domain: null,
            supportEmailAddress: null,
        })

        user = userEvent.setup()

        window.fetch = mockFetch({
            backendNeuroSanApiUrl: testNeuroSanURL,
            auth0ClientId: testClientId,
            auth0Domain: testDomain,
            supportEmailAddress: testSupportEmailAddress,
            oidcHeaderFound: true,
            username: "testUser",
        })
        ;(useRouter as jest.Mock).mockReturnValue({
            pathname: "/projects",
        })
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
    })

    it("Should render correctly when authentication is disabled", async () => {
        ;(authenticationEnabled as jest.Mock).mockReturnValue(false)

        render(APP_COMPONENT)

        await screen.findByText(COMPONENT_BODY)

        // No authentication so values should be defaults
        const state = useEnvironmentStore.getState()
        expect(state.backendNeuroSanApiUrl).toBe(DEFAULT_NEURO_SAN_SERVER_URL)
        expect(state.auth0ClientId).toBe("")
        expect(state.auth0Domain).toBe("")
        expect(state.supportEmailAddress).toBe("")
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

    it("Should render the splash page correctly", async () => {
        ;(useRouter as jest.Mock).mockReturnValue({
            pathname: "/", // Splash page
        })

        render(APP_COMPONENT)

        await screen.findByText(COMPONENT_BODY)
        expect(document.getElementById("body-div")).toBeInTheDocument()
    })
})

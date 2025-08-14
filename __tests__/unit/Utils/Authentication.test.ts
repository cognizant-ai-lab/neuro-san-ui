import {signOut} from "next-auth/react"

import {AD_TENANT_ID, smartSignOut} from "../../../utils/Authentication"
import * as BrowserNavigation from "../../../utils/BrowserNavigation"
import {navigateToUrl} from "../../../utils/BrowserNavigation"
import {withStrictMocks} from "../../common/strictMocks"
import {mockFetch} from "../../common/TestUtils"

// Mock the next-auth/react module
jest.mock("next-auth/react")

/**
 * Unit tests for the authentication utility module
 */
describe("useAuthentication", () => {
    withStrictMocks()

    let oldFetch: typeof window.fetch

    beforeEach(() => {
        jest.spyOn(BrowserNavigation, "navigateToUrl")
        ;(navigateToUrl as jest.Mock).mockImplementation()

        oldFetch = window.fetch
        window.fetch = mockFetch({})
    })

    afterEach(() => {
        window.fetch = oldFetch
    })

    it("Does nothing if currentUser not available", async () => {
        ;(signOut as jest.Mock).mockResolvedValueOnce(undefined)

        await smartSignOut(undefined, null, null, null)

        expect(signOut).not.toHaveBeenCalled()
        expect(navigateToUrl).not.toHaveBeenCalled()
    })

    it("Delegates to NextAuth signOut() if provider is NextAuth", async () => {
        await smartSignOut("user", null, null, "NextAuth")

        expect(signOut).toHaveBeenCalled()
    })

    it("Handles sign-out for ALB with AD provider", async () => {
        await smartSignOut("user", "example.com", "clientId", "AD")
        expect(navigateToUrl).toHaveBeenCalledWith(
            `https://login.microsoftonline.com/${AD_TENANT_ID}/oauth2/v2.0/logout`
        )
    })

    it("Handles sign-out for ALB with Github provider", async () => {
        const auth0Domain = "example.com"
        const auth0ClientId = "clientId"
        await smartSignOut("user", auth0Domain, auth0ClientId, "Github")

        const expectedReturnTo = encodeURIComponent(`http://${window.location.host}`)
        expect(navigateToUrl).toHaveBeenCalledWith(
            `https://${auth0Domain}/v2/logout?client_id=${auth0ClientId}&returnTo=${expectedReturnTo}`
        )
    })
})

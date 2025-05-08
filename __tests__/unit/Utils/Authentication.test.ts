import {signOut} from "next-auth/react"

import {AD_TENANT_ID, smartSignOut} from "../../../utils/Authentication"
import {withStrictMocks} from "../../common/strictMocks"
import {mockFetch} from "../../testUtils"

// Mock the next-auth/react module
jest.mock("next-auth/react")

/**
 * Unit tests for the authentication utility module
 */
describe("useAuthentication", () => {
    withStrictMocks()

    // eslint-disable-next-line no-shadow
    const {location} = window

    // Mock the window location so we can test the redirect
    beforeAll(() => {
        delete window.location
        // eslint-disable-next-line @typescript-eslint/no-misused-spread
        window.location = {...location, href: "www.example.com", host: "127.0.0.1"}
    })

    afterAll(() => {
        window.location = location
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })
    it("Does nothing if currentUser not available", async () => {
        ;(signOut as jest.Mock).mockResolvedValueOnce(undefined)

        await smartSignOut(undefined, null, null, null)

        expect(signOut).not.toHaveBeenCalled()
        expect(window.location.href).toBe("www.example.com")
    })

    it("Delegates to NextAuth signOut() if provider is NextAuth", async () => {
        await smartSignOut("user", null, null, "NextAuth")

        expect(signOut).toHaveBeenCalled()
    })

    it("Handles sign-out for ALB with AD provider", async () => {
        const oldFetch = window.fetch
        window.fetch = mockFetch({})

        await smartSignOut("user", "example.com", "clientId", "AD")

        expect(window.location.href).toBe(`https://login.microsoftonline.com/${AD_TENANT_ID}/oauth2/v2.0/logout`)

        window.fetch = oldFetch
    })

    it("Handles sign-out for ALB with Github provider", async () => {
        const oldFetch = window.fetch
        window.fetch = mockFetch({})

        const auth0Domain = "example.com"
        const auth0ClientId = "clientId"
        await smartSignOut("user", auth0Domain, auth0ClientId, "Github")

        const expectedReturnTo = encodeURIComponent("http://127.0.0.1")
        expect(window.location.href).toBe(
            `https://${auth0Domain}/v2/logout?client_id=${auth0ClientId}&returnTo=${expectedReturnTo}`
        )

        window.fetch = oldFetch
    })
})

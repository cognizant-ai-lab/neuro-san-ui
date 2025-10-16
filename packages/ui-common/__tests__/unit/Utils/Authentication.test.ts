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

import {signOut} from "next-auth/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../__tests__/common/TestUtils"
import {AD_TENANT_ID, smartSignOut} from "../../../utils/Authentication"
import * as BrowserNavigation from "../../../utils/BrowserNavigation"
import {navigateToUrl} from "../../../utils/BrowserNavigation"

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

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

import {renderHook} from "@testing-library/react"
import {signOut} from "next-auth/react"
// eslint-disable-next-line no-shadow
import {afterEach, beforeEach, describe, expect, it, MockInstance, vi} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/vitest/strictMocks"
import {mockFetch} from "../../../../../__tests__/common/vitest/TestUtils"
import {DEFAULT_USER_IMAGE, DEFAULT_USERNAME} from "../../../const"
import {AD_TENANT_ID, smartSignOut, useAuthentication} from "../../../utils/Authentication"
import * as BrowserNavigation from "../../../utils/BrowserNavigation"

vi.mock("next-auth/react")

const mockedSignOut = vi.mocked(signOut)

let navigateToUrlSpy: MockInstance<typeof BrowserNavigation.navigateToUrl>

/**
 * Unit tests for the authentication utility module
 */
describe("useAuthentication", () => {
    withStrictMocks()

    let oldFetch: typeof window.fetch

    beforeEach(() => {
        navigateToUrlSpy = vi.spyOn(BrowserNavigation, "navigateToUrl").mockImplementation(() => undefined)

        oldFetch = window.fetch
        window.fetch = mockFetch({})

        process.env["NEXT_PUBLIC_ENABLE_AUTHENTICATION"] = "true"
    })

    afterEach(() => {
        window.fetch = oldFetch
    })

    describe("useAuthentication", () => {
        it("Returns default user when authentication is disabled", () => {
            // Disable auth for this test
            process.env["NEXT_PUBLIC_ENABLE_AUTHENTICATION"] = "false"
            const {result} = renderHook(() => useAuthentication())
            expect(result.current.data.user.name).toBe(DEFAULT_USERNAME)
            expect(result.current.data.user.image).toBe(DEFAULT_USER_IMAGE)
        })
    })

    describe("signOut", () => {
        it("Does nothing if currentUser not available", async () => {
            mockedSignOut.mockResolvedValueOnce(undefined)

            await smartSignOut(undefined, null, null, null)

            expect(signOut).not.toHaveBeenCalled()
            expect(navigateToUrlSpy).not.toHaveBeenCalled()
        })

        it("Delegates to NextAuth signOut() if provider is NextAuth", async () => {
            await smartSignOut("user", null, null, "NextAuth")

            expect(signOut).toHaveBeenCalled()
        })

        it("Handles sign-out for ALB with AD provider", async () => {
            await smartSignOut("user", "example.com", "clientId", "AD")
            expect(navigateToUrlSpy).toHaveBeenCalledWith(
                `https://login.microsoftonline.com/${AD_TENANT_ID}/oauth2/v2.0/logout`
            )
        })

        it("Handles sign-out for ALB with Github provider", async () => {
            const auth0Domain = "example.com"
            const auth0ClientId = "clientId"
            await smartSignOut("user", auth0Domain, auth0ClientId, "Github")

            const expectedReturnTo = encodeURIComponent(`http://${window.location.host}`)
            expect(navigateToUrlSpy).toHaveBeenCalledWith(
                `https://${auth0Domain}/v2/logout?client_id=${auth0ClientId}&returnTo=${expectedReturnTo}`
            )
        })
    })
})

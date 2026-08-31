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

import {render, screen} from "@testing-library/react"
import {signIn, signOut, useSession} from "next-auth/react"
import {ReactNode} from "react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {NextAuthSessionProvider, registerNextAuthSession} from "../../../utils/NextAuthAdapter"
import {getSessionAdapter, resetSessionAdapter} from "../../../utils/SessionAdapter"

vi.mock("next-auth/react", () => ({
    SessionProvider: ({children}: {children: ReactNode}) => <>{children}</>,
    useSession: vi.fn(() => ({data: undefined, status: "unauthenticated"})),
    signIn: vi.fn(),
    signOut: vi.fn(),
}))

describe("NextAuthAdapter", () => {
    withStrictMocks()

    beforeEach(() => {
        resetSessionAdapter()
        vi.mocked(useSession).mockReturnValue({
            data: {user: {name: "Ada"}, expires: "2099-01-01T00:00:00.000Z"},
            status: "authenticated",
            update: vi.fn(),
        })
        registerNextAuthSession()
    })

    afterEach(() => {
        resetSessionAdapter()
    })

    it("points the session adapter at next-auth so signed-in user data is available", () => {
        const adapter = getSessionAdapter()

        expect(adapter.useSession().data?.user?.name).toBe("Ada")
        expect(adapter.useSessionStatus()).toBe("authenticated")
    })

    it("delegates signIn to next-auth", () => {
        getSessionAdapter().signIn("auth0")

        expect(signIn).toHaveBeenCalledWith("auth0")
    })

    it("signs out with a redirect when none is specified", () => {
        getSessionAdapter().signOut()

        expect(signOut).toHaveBeenCalledWith({redirect: true})
    })

    it("signs out with a redirect when redirect is true", () => {
        getSessionAdapter().signOut({redirect: true})

        expect(signOut).toHaveBeenCalledWith({redirect: true})
    })

    it("signs out without a redirect when asked not to", () => {
        getSessionAdapter().signOut({redirect: false})

        expect(signOut).toHaveBeenCalledWith({redirect: false})
    })

    it("renders children through next-auth's SessionProvider", () => {
        render(
            <NextAuthSessionProvider>
                <div>inside the provider</div>
            </NextAuthSessionProvider>
        )

        screen.getByText("inside the provider")
    })
})

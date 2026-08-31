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

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {Auth} from "../../../components/Authentication/Auth"
import {SessionStatus, setSessionAdapter} from "../../../utils/SessionAdapter"

const AUTH_CHILDREN_TEXT = "Mock Auth"

const AUTH_ELEMENT = (
    <Auth>
        <div>{AUTH_CHILDREN_TEXT}</div>
    </Auth>
)

const renderWithSession = (user: {name: string} | undefined, sessionStatus: SessionStatus) => {
    const signIn = vi.fn()

    setSessionAdapter({
        useSession: () => ({data: user === undefined ? null : {user}}),
        useSessionStatus: () => sessionStatus,
        signIn,
        signOut: vi.fn(),
    })

    render(AUTH_ELEMENT)

    return {signIn}
}

describe("Auth Component", () => {
    withStrictMocks()

    it("should render a spinner while the session is loading", () => {
        renderWithSession(undefined, "loading")

        screen.getByText("Loading... Please wait")
    })

    it("should call signIn when user is not authenticated", () => {
        const {signIn} = renderWithSession(undefined, "unauthenticated")

        expect(signIn).toHaveBeenCalledWith("auth0")
    })

    it("should pass through children when user is authenticated", async () => {
        const {signIn} = renderWithSession({name: "Test User"}, "authenticated")

        expect(signIn).not.toHaveBeenCalled()
        await screen.findByText(AUTH_CHILDREN_TEXT)
    })
})

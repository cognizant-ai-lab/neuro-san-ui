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
import {SessionContextValue, signIn, useSession} from "next-auth/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {Auth} from "../../../components/Authentication/Auth"

const AUTH_CHILDREN_TEXT = "Mock Auth"

const AUTH_ELEMENT = (
    <Auth>
        <div>{AUTH_CHILDREN_TEXT}</div>
    </Auth>
)

// Note: next-auth/react has its own mock under __mocks__/next-auth/react.js so we don't need to mock here.
describe("Auth Component", () => {
    withStrictMocks()

    it("should render a spinner when status is loading", () => {
        ;(useSession as jest.Mock).mockReturnValue({status: "loading"} as SessionContextValue)
        render(AUTH_ELEMENT)

        expect(screen.getByText("Loading... Please wait")).toBeInTheDocument()
    })

    it("should call signIn when user is not authenticated", () => {
        ;(useSession as jest.Mock).mockReturnValue({data: {session: {user: undefined}}} as SessionContextValue)
        render(AUTH_ELEMENT)

        expect(signIn).toHaveBeenCalledWith("auth0")
    })

    it("should pass through children when user is authenticated", async () => {
        ;(useSession as jest.Mock).mockReturnValue({
            data: {user: {name: "Test User", email: "test@example.com"}},
            status: "authenticated",
        } as SessionContextValue)
        render(AUTH_ELEMENT)

        expect(signIn).not.toHaveBeenCalled()
        await screen.findByText(AUTH_CHILDREN_TEXT)
    })
})

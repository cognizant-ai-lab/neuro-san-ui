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
import {signIn, useSession} from "next-auth/react"
import {describe, expect, it, vi} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {Auth} from "../../../components/Authentication/Auth"

const AUTH_CHILDREN_TEXT = "Mock Auth"

const AUTH_ELEMENT = (
    <Auth>
        <div>{AUTH_CHILDREN_TEXT}</div>
    </Auth>
)

vi.mock("next-auth/react")

describe("Auth Component", () => {
    withStrictMocks()

    it("should render a spinner when status is loading", () => {
        vi.mocked(useSession).mockReturnValue({data: null, status: "loading", update: undefined})
        render(AUTH_ELEMENT)

        expect(screen.getByText("Loading... Please wait")).toBeInTheDocument()
    })

    it("should call signIn when user is not authenticated", () => {
        vi.mocked(useSession).mockReturnValue({
            data: {user: undefined, expires: undefined},
            status: undefined,
            update: undefined,
        })
        render(AUTH_ELEMENT)

        expect(signIn).toHaveBeenCalledWith("auth0")
    })

    it("should pass through children when user is authenticated", async () => {
        vi.mocked(useSession).mockReturnValue({
            data: {user: {name: "Test User", email: "test@example.com"}, expires: undefined},
            status: "authenticated",
            update: undefined,
        })
        render(AUTH_ELEMENT)

        expect(signIn).not.toHaveBeenCalled()
        await screen.findByText(AUTH_CHILDREN_TEXT)
    })
})

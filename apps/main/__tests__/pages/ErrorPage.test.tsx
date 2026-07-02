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

import {render, screen, waitFor} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"
import {beforeEach, describe, expect, it, vi} from "vitest"

import {withStrictMocks} from "../../../../__tests__/common/vitest/strictMocks"
import {default as ErrorPage} from "../../../../packages/ui-common/components/ErrorPage/ErrorPage"
import {LOGO} from "../../../../packages/ui-common/const"
import {smartSignOut, useAuthentication} from "../../../../packages/ui-common/utils/Authentication"

vi.mock("next-auth/react", () => ({
    useSession: () => ({
        status: "authenticated",
    }),
}))

vi.mock("next/router", () => ({
    useRouter: () => ({
        pathname: "",
        query: {
            someValue: 42,
        },
    }),
}))

vi.mock("../../../../packages/ui-common/utils/Authentication")
const mockSmartSignOut = vi.mocked(smartSignOut)

describe("ErrorPage", () => {
    withStrictMocks()

    let user: UserEvent

    beforeEach(() => {
        user = userEvent.setup()
        vi.mocked(useAuthentication).mockReturnValue({
            data: {user: {name: "mock-user", image: "mock-image-url"}},
        })
    })

    it("Should render correctly", async () => {
        render(
            <ErrorPage
                id="test-error-page"
                errorText="Error page for testing"
            />
        )

        await screen.findByText(new RegExp(LOGO, "u"))
    })

    it("Should handle sign out correctly", async () => {
        render(
            <ErrorPage
                id="test-error-page"
                errorText="Error page for testing"
            />
        )

        // Locate sign out button and click it
        const userDropdownToggle = await screen.findByRole("button", {name: "User dropdown toggle"})
        await user.click(userDropdownToggle)

        const signOut = await screen.findByText("Sign out")
        await user.click(signOut)

        await waitFor(() => expect(mockSmartSignOut).toHaveBeenCalled())
    })
})

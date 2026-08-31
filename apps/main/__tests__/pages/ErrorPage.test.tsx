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
import {Mock} from "vitest"

import {withStrictMocks} from "../../../../__tests__/common/strictMocks"
import {default as ErrorPage, ErrorPageProps} from "../../../../packages/ui-common/components/ErrorPage/ErrorPage"
import {LOGO} from "../../../../packages/ui-common/const"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/Environment"

vi.mock("next/router", () => ({
    useRouter: () => ({
        pathname: "",
        query: {
            someValue: 42,
        },
    }),
}))

const USER_INFO = {name: "mock-user", image: "mock-image-url"}

describe("ErrorPage", () => {
    withStrictMocks()

    let user: UserEvent
    let signOut: Mock<ErrorPageProps["signOut"]>

    beforeEach(() => {
        user = userEvent.setup()
        signOut = vi.fn<ErrorPageProps["signOut"]>()

        useEnvironmentStore.getState().setEnableAuthentication(true)
    })

    const renderErrorPage = (userInfo: ErrorPageProps["userInfo"]) =>
        render(
            <ErrorPage
                id="test-error-page"
                errorText="Error page for testing"
                userInfo={userInfo}
                authenticationType="NextAuth"
                signOut={signOut}
            />
        )

    it("Should render correctly", async () => {
        renderErrorPage(USER_INFO)

        await screen.findByText(new RegExp(LOGO, "u"))
    })

    it("Should render when authentication has not produced a user yet", async () => {
        // The app derives the user from a session that may not have resolved yet, so the page still has to render
        // without one.
        renderErrorPage(undefined)

        await screen.findByText(new RegExp(LOGO, "u"))
    })

    it("Should handle sign out correctly", async () => {
        renderErrorPage(USER_INFO)

        // Locate sign out button and click it
        const userDropdownToggle = await screen.findByRole("button", {name: "User dropdown toggle"})
        await user.click(userDropdownToggle)

        const signOutButton = await screen.findByText("Sign out")
        await user.click(signOutButton)

        await waitFor(() => expect(signOut).toHaveBeenCalled())
    })
})

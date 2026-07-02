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
import {userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {MUIAlert} from "../../../components/Common/MUIAlert"

describe("MUIAlert Component", () => {
    withStrictMocks()

    const DefaultMUIAlert = (
        <MUIAlert
            id="test-alert"
            severity="error"
        >
            Test Alert Message
        </MUIAlert>
    )

    const CloseableMUIAlert = (
        <MUIAlert
            closeable={true}
            id="test-alert"
            severity="error"
        >
            Test Alert Message
        </MUIAlert>
    )

    it("should render the alert with given props", () => {
        render(DefaultMUIAlert)
        expect(screen.getByText("Test Alert Message")).toBeInTheDocument()
        expect(screen.queryByRole("button", {name: /close/iu})).not.toBeInTheDocument()
    })

    it("should show close button when closeable is true and close the alert when close button is clicked", async () => {
        const user = userEvent.setup()
        render(CloseableMUIAlert)

        const closeButton = screen.getByRole("button", {name: /close/iu})
        await user.click(closeButton)
        await waitFor(() => {
            expect(screen.queryByText("Test Alert Message")).not.toBeVisible()
        })
    })
})

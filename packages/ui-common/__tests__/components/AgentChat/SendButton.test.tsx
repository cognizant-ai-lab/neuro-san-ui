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
import {UserEvent, default as userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {SendButton} from "../../../components/AgentChat/SendButton"

describe("SendButton", () => {
    let user: UserEvent
    const handleClick = jest.fn()

    withStrictMocks()

    beforeEach(() => {
        user = userEvent.setup()
    })

    it("renders button with correct attributes", () => {
        render(
            <SendButton
                enableSendButton={true}
                id="test-button"
                onClickCallback={handleClick}
            />
        )

        const button = screen.getByRole("button", {name: "Send"})
        expect(button).toBeInTheDocument()
        expect(button).toBeEnabled()
    })

    it("disables button when enableSendButton is false", () => {
        render(
            <SendButton
                enableSendButton={false}
                id="test-button"
                onClickCallback={handleClick}
            />
        )

        const button = screen.getByRole("button", {name: "Send"})
        expect(button).toBeDisabled()
    })

    it("calls onClickCallback when clicked", async () => {
        render(
            <SendButton
                enableSendButton={true}
                id="test-button"
                onClickCallback={handleClick}
            />
        )

        const button = screen.getByRole("button", {name: "Send"})
        await user.click(button)
        expect(handleClick).toHaveBeenCalledTimes(1)
    })
})

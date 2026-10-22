/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import {act, render, screen, waitFor} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {KEEP_WAITING_LABEL, KeepWaitingPrompt, STOP_WAITING_LABEL} from "../../../components/Common/KeepWaitingPrompt"

const ASK_AFTER_MS = 60_000

describe("KeepWaitingPrompt", () => {
    withStrictMocks()

    let user: UserEvent
    const onStopWaiting = vi.fn()

    const renderPrompt = () =>
        render(
            <KeepWaitingPrompt
                activity='Publishing "Cailville Bakery"'
                askAfterMs={ASK_AFTER_MS}
                id="keep-waiting"
                onStopWaiting={onStopWaiting}
            />
        )

    const waitLong = () => act(() => vi.advanceTimersByTime(ASK_AFTER_MS))

    beforeEach(() => {
        vi.useFakeTimers({shouldAdvanceTime: true})
        user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("should not ask before the wait gets long", () => {
        renderPrompt()

        act(() => vi.advanceTimersByTime(ASK_AFTER_MS - 1))

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("should ask whether to keep waiting once the wait gets long", () => {
        renderPrompt()

        waitLong()

        expect(screen.getByRole("dialog")).toHaveTextContent('Publishing "Cailville Bakery" is still in progress.')
    })

    it("should ask again after Keep waiting, once the wait gets long again", async () => {
        renderPrompt()
        waitLong()
        const keepWaitingButton = screen.getByRole("button", {name: KEEP_WAITING_LABEL})

        await user.click(keepWaitingButton)
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        waitLong()

        screen.getByRole("dialog")
        expect(onStopWaiting).not.toHaveBeenCalled()
    })

    it("should stop waiting when Stop waiting is clicked", async () => {
        renderPrompt()
        waitLong()
        const stopWaitingButton = screen.getByRole("button", {name: STOP_WAITING_LABEL})

        await user.click(stopWaitingButton)

        expect(onStopWaiting).toHaveBeenCalledTimes(1)
    })
})

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
import {
    CONTINUE_WAITING_LABEL,
    KeepWaitingPrompt,
    STOP_WAITING_LABEL,
    WAIT_REMINDER_QUESTION,
} from "../../../components/Common/KeepWaitingPrompt"
import {FIRST_WAIT_REMINDER_MS, REPEATED_WAIT_REMINDER_MS} from "../../../components/Common/useWaitReminder"

const ACTIVITY = 'Publishing "Cailville Bakery"'

describe("KeepWaitingPrompt", () => {
    withStrictMocks()

    let user: UserEvent
    const onStopWaiting = vi.fn()

    const renderPrompt = (firstAskMs?: number) =>
        render(
            <KeepWaitingPrompt
                activity={ACTIVITY}
                firstAskMs={firstAskMs}
                id="keep-waiting"
                onStopWaiting={onStopWaiting}
            />
        )

    const waitLong = (ms: number) => act(() => vi.advanceTimersByTime(ms))

    beforeEach(() => {
        vi.useFakeTimers({shouldAdvanceTime: true})
        user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("should not ask before the wait gets long", () => {
        renderPrompt()

        waitLong(FIRST_WAIT_REMINDER_MS - 1)

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("should say what is taking long and ask whether to continue waiting", () => {
        renderPrompt()

        waitLong(FIRST_WAIT_REMINDER_MS)

        const waitPrompt = screen.getByRole("dialog")
        expect(waitPrompt).toHaveTextContent(`${ACTIVITY} is taking longer than expected.`)
        expect(waitPrompt).toHaveTextContent(WAIT_REMINDER_QUESTION)
    })

    it("should ask first after the time it is given", () => {
        renderPrompt(5000)

        waitLong(5000)

        screen.getByRole("dialog")
    })

    it("should ask again sooner after Continue waiting", async () => {
        renderPrompt()
        waitLong(FIRST_WAIT_REMINDER_MS)
        const continueWaitingButton = screen.getByRole("button", {name: CONTINUE_WAITING_LABEL})

        await user.click(continueWaitingButton)
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        waitLong(REPEATED_WAIT_REMINDER_MS)

        screen.getByRole("dialog")
        expect(onStopWaiting).not.toHaveBeenCalled()
    })

    it("should stop waiting when Cancel is clicked", async () => {
        renderPrompt()
        waitLong(FIRST_WAIT_REMINDER_MS)
        const cancelButton = screen.getByRole("button", {name: STOP_WAITING_LABEL})

        await user.click(cancelButton)

        expect(onStopWaiting).toHaveBeenCalledTimes(1)
    })

    it("should stop waiting when Escape is pressed", async () => {
        renderPrompt()
        waitLong(FIRST_WAIT_REMINDER_MS)

        await user.keyboard("{Escape}")

        expect(onStopWaiting).toHaveBeenCalledTimes(1)
    })
})

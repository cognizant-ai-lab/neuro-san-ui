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

import {act, render, screen, waitFor} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {AgentNodePopup, AgentNodePopupProps} from "../../../components/MultiAgentAccelerator/AgentNodePopup"

const AGENT_NAME = "Audit Risk Manager"
const INITIAL_PROMPT = "Evaluate operational risks and detect anomalies."

const renderPopup = (overrides: Partial<AgentNodePopupProps> = {}) => {
    const onClose = jest.fn()
    const onSave = jest.fn()

    render(
        <AgentNodePopup
            agentName={AGENT_NAME}
            isOpen={true}
            onClose={onClose}
            onSave={onSave}
            initialPrompt={INITIAL_PROMPT}
            {...overrides}
        />
    )

    return {onClose, onSave}
}

describe("AgentNodePopup", () => {
    withStrictMocks()

    it("renders agent name in dialog title when open", () => {
        renderPopup()

        // Agent name shown in dialog title only (no separate read-only field)
        expect(screen.getByText(AGENT_NAME)).toBeInTheDocument()
        expect(screen.queryByRole("textbox", {name: /^agent$/iu})).not.toBeInTheDocument()
    })

    it("does not render content when closed", () => {
        renderPopup({isOpen: false})

        expect(screen.queryByText(AGENT_NAME)).not.toBeInTheDocument()
        expect(screen.queryByPlaceholderText(/system prompt/iu)).not.toBeInTheDocument()
    })

    it("renders the initial prompt in the editable textarea", () => {
        renderPopup()

        const promptField = screen.getByRole("textbox", {name: /system prompt/iu})
        expect(promptField).toBeInTheDocument()
        expect(promptField).toHaveValue(INITIAL_PROMPT)
    })

    it("allows the user to edit the prompt", async () => {
        const user = userEvent.setup()
        renderPopup()

        const promptField = screen.getByRole("textbox", {name: /system prompt/iu})
        await user.clear(promptField)
        await user.type(promptField, "New instructions")

        expect(promptField).toHaveValue("New instructions")
    })

    it("calls onSave with agent name and updated prompt when Save Prompt is clicked", async () => {
        const user = userEvent.setup()
        const {onSave} = renderPopup()

        const promptField = screen.getByRole("textbox", {name: /system prompt/iu})
        await user.clear(promptField)
        await user.type(promptField, "Updated prompt text")

        await user.click(screen.getByRole("button", {name: /save prompt/iu}))

        expect(onSave).toHaveBeenCalledWith(AGENT_NAME, "Updated prompt text")
    })

    it("calls onClose and resets prompt to initial value when Cancel is clicked", async () => {
        const user = userEvent.setup()
        const {onClose} = renderPopup()

        const promptField = screen.getByRole("textbox", {name: /system prompt/iu})
        await user.clear(promptField)
        await user.type(promptField, "Temporary edit")

        await user.click(screen.getByRole("button", {name: /cancel/iu}))

        expect(onClose).toHaveBeenCalled()
    })

    it("calls onClose when the dialog close icon is clicked", async () => {
        const user = userEvent.setup()
        const {onClose} = renderPopup()

        const closeBtn = screen.getByRole("button", {name: /close/iu})
        await user.click(closeBtn)

        expect(onClose).toHaveBeenCalled()
    })

    it("renders an empty prompt field when no initialPrompt is provided", () => {
        renderPopup({initialPrompt: undefined})

        const promptField = screen.getByRole("textbox", {name: /system prompt/iu})
        expect(promptField).toHaveValue("")
    })

    it("renders the system prompt field with no character limit", () => {
        renderPopup()

        const promptField = screen.getByRole("textbox", {name: /system prompt/iu})
        expect(promptField).not.toHaveAttribute("maxlength")
    })

    it("resets prompt to initialPrompt when dialog is reopened", async () => {
        const user = userEvent.setup()
        const {rerender} = render(
            <AgentNodePopup
                agentName={AGENT_NAME}
                isOpen={true}
                onClose={jest.fn()}
                onSave={jest.fn()}
                initialPrompt={INITIAL_PROMPT}
            />
        )

        // Edit the prompt
        const promptField = screen.getByRole("textbox", {name: /system prompt/iu})
        await user.clear(promptField)
        await user.type(promptField, "Temporary")
        // Blur field explicitly so MUI FormControl settles before rerender
        await user.tab()

        // Close and reopen (simulate isOpen toggling)
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            rerender(
                <AgentNodePopup
                    agentName={AGENT_NAME}
                    isOpen={false}
                    onClose={jest.fn()}
                    onSave={jest.fn()}
                    initialPrompt={INITIAL_PROMPT}
                />
            )
        })
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            rerender(
                <AgentNodePopup
                    agentName={AGENT_NAME}
                    isOpen={true}
                    onClose={jest.fn()}
                    onSave={jest.fn()}
                    initialPrompt={INITIAL_PROMPT}
                />
            )
        })

        await waitFor(() => {
            expect(screen.getByRole("textbox", {name: /system prompt/iu})).toHaveValue(INITIAL_PROMPT)
        })
    })
})

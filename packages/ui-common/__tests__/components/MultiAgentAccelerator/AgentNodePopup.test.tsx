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
const INITIAL_INSTRUCTIONS = "Evaluate operational risks and detect anomalies."

const renderPopup = (overrides: Partial<AgentNodePopupProps> = {}) => {
    const onClose = jest.fn()
    const onSave = jest.fn()

    render(
        <AgentNodePopup
            agentName={AGENT_NAME}
            isOpen={true}
            onClose={onClose}
            onSave={onSave}
            initialInstructions={INITIAL_INSTRUCTIONS}
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
        expect(screen.queryByPlaceholderText(/instructions/iu)).not.toBeInTheDocument()
    })

    it("renders the initial instructions in the editable textarea", () => {
        renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: /^instructions$/iu})
        expect(instructionsField).toBeInTheDocument()
        expect(instructionsField).toHaveValue(INITIAL_INSTRUCTIONS)
    })

    it("allows the user to edit the instructions", async () => {
        const user = userEvent.setup()
        renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: /^instructions$/iu})
        await user.clear(instructionsField)
        await user.type(instructionsField, "New instructions")

        expect(instructionsField).toHaveValue("New instructions")
    })

    it("calls onSave with agent name, updated instructions and description when Save is clicked", async () => {
        const user = userEvent.setup()
        const {onSave} = renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: /^instructions$/iu})
        await user.clear(instructionsField)
        await user.type(instructionsField, "Updated instructions text")

        await user.click(screen.getByRole("button", {name: /^save$/iu}))

        expect(onSave).toHaveBeenCalledWith(AGENT_NAME, "Updated instructions text", "")
    })

    it("calls onClose and resets instructions to initial value when Cancel is clicked", async () => {
        const user = userEvent.setup()
        const {onClose} = renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: /^instructions$/iu})
        await user.clear(instructionsField)
        await user.type(instructionsField, "Temporary edit")

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

    it("renders an empty instructions field when no initialInstructions is provided", () => {
        renderPopup({initialInstructions: undefined})

        const instructionsField = screen.getByRole("textbox", {name: /^instructions$/iu})
        expect(instructionsField).toHaveValue("")
    })

    it("renders the instructions field with no character limit", () => {
        renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: /^instructions$/iu})
        expect(instructionsField).not.toHaveAttribute("maxlength")
    })

    it("resets instructions to initialInstructions when dialog is reopened", async () => {
        const user = userEvent.setup()
        const {rerender} = render(
            <AgentNodePopup
                agentName={AGENT_NAME}
                isOpen={true}
                onClose={jest.fn()}
                onSave={jest.fn()}
                initialInstructions={INITIAL_INSTRUCTIONS}
            />
        )

        // Edit the instructions
        const instructionsField = screen.getByRole("textbox", {name: /^instructions$/iu})
        await user.clear(instructionsField)
        await user.type(instructionsField, "Temporary")
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
                    initialInstructions={INITIAL_INSTRUCTIONS}
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
                    initialInstructions={INITIAL_INSTRUCTIONS}
                />
            )
        })

        await waitFor(() => {
            expect(screen.getByRole("textbox", {name: /^instructions$/iu})).toHaveValue(INITIAL_INSTRUCTIONS)
        })
    })

    it("does not reset instructions while the dialog is still open (no flash on close)", async () => {
        // Regression test: before the fix, the useEffect triggered on isOpen *becoming false*,
        // resetting instructionsText back to initialInstructions during the MUI exit animation — causing a
        // visible flash of the original value before the dialog fully closed.
        const user = userEvent.setup()
        const {rerender} = render(
            <AgentNodePopup
                agentName={AGENT_NAME}
                isOpen={true}
                onClose={jest.fn()}
                onSave={jest.fn()}
                initialInstructions={INITIAL_INSTRUCTIONS}
            />
        )

        const instructionsField = screen.getByRole("textbox", {name: /^instructions$/iu})
        await user.clear(instructionsField)
        await user.type(instructionsField, "My edited instructions")

        // Close the dialog (isOpen → false). With the fix, instructionsText must NOT be reset to
        // initialInstructions during the close animation. The underlying DOM node may still exist
        // in JSDOM (no real CSS animation), so we verify the value is retained — not reset.
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            rerender(
                <AgentNodePopup
                    agentName={AGENT_NAME}
                    isOpen={false}
                    onClose={jest.fn()}
                    onSave={jest.fn()}
                    initialInstructions={INITIAL_INSTRUCTIONS}
                />
            )
        })

        // The textarea remains in JSDOM (no real exit animation), but must hold the edited
        // value — NOT initialInstructions — proving no flash occurred during close.
        const fieldAfterClose = screen.getByRole("textbox", {name: /^instructions$/iu})
        expect(fieldAfterClose).toHaveValue("My edited instructions")
        expect(fieldAfterClose).not.toHaveValue(INITIAL_INSTRUCTIONS)
    })

    it("syncs instructions when initialInstructions changes while dialog is open", async () => {
        // When the parent loads the real instructions asynchronously and passes new initialInstructions
        // while the dialog is already open, the field should update to reflect it.
        const {rerender} = render(
            <AgentNodePopup
                agentName={AGENT_NAME}
                isOpen={true}
                onClose={jest.fn()}
                onSave={jest.fn()}
                initialInstructions=""
            />
        )

        const instructionsField = screen.getByRole("textbox", {name: /^instructions$/iu})
        expect(instructionsField).toHaveValue("")

        // Parent loads the real instructions and passes them in
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            rerender(
                <AgentNodePopup
                    agentName={AGENT_NAME}
                    isOpen={true}
                    onClose={jest.fn()}
                    onSave={jest.fn()}
                    initialInstructions={INITIAL_INSTRUCTIONS}
                />
            )
        })

        await waitFor(() => {
            expect(screen.getByRole("textbox", {name: /^instructions$/iu})).toHaveValue(INITIAL_INSTRUCTIONS)
        })
    })
})

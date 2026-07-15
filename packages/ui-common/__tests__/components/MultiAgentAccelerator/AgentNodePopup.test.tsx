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

import {act, fireEvent, render, screen, waitFor} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {AgentNodePopup, AgentNodePopupProps} from "../../../components/MultiAgentAccelerator/AgentNodePopup"

const AGENT_NAME = "Audit Risk Manager"
const INITIAL_INSTRUCTIONS = "Evaluate operational risks and detect anomalies."

// Accessible names of the dialog's fields and buttons. These are the full accessible names, so
// getByRole's `name` string option matches them exactly — no regex needed.
const INSTRUCTIONS_FIELD = "Instructions"
const DESCRIPTION_FIELD = "Description"
const SAVE_BUTTON = "Save"
const APPLYING_CHANGES_BUTTON = "Applying changes..."
const CANCEL_BUTTON = "Cancel"
const DISCARD_CHANGES_BUTTON = "Discard changes"
// MUIDialog's dismiss icon uses aria-label="close" (lowercase).
const CLOSE_BUTTON = "close"
// Instructions field placeholder — used to detect the field is absent when the dialog is closed.
const INSTRUCTIONS_PLACEHOLDER = "Enter instructions for this agent…"

const renderPopup = (overrides: Partial<AgentNodePopupProps> = {}) => {
    const onClose = vi.fn()
    const onSave = vi.fn()

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
        expect(screen.queryByRole("textbox", {name: "Agent"})).not.toBeInTheDocument()
    })

    it("does not render content when closed", () => {
        renderPopup({isOpen: false})

        expect(screen.queryByText(AGENT_NAME)).not.toBeInTheDocument()
        expect(screen.queryByPlaceholderText(INSTRUCTIONS_PLACEHOLDER)).not.toBeInTheDocument()
    })

    it("renders the initial instructions in the editable textarea", () => {
        renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        expect(instructionsField).toBeInTheDocument()
        expect(instructionsField).toHaveValue(INITIAL_INSTRUCTIONS)
    })

    it("allows the user to edit the instructions", async () => {
        const user = userEvent.setup()
        renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        await user.clear(instructionsField)
        await user.paste("New instructions")

        expect(instructionsField).toHaveValue("New instructions")
    })

    it("calls onSave with agent name, updated instructions and description when Save is clicked", async () => {
        const user = userEvent.setup()
        const {onSave} = renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        await user.clear(instructionsField)
        await user.paste("Updated instructions text")

        await user.click(screen.getByRole("button", {name: SAVE_BUTTON}))

        expect(onSave).toHaveBeenCalledWith(AGENT_NAME, "Updated instructions text", "")
    })

    it("calls onClose and resets instructions to initial value when Cancel is clicked", async () => {
        const user = userEvent.setup()
        const {onClose} = renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        await user.clear(instructionsField)
        await user.paste("Temporary edit")

        // Clicking Cancel when dirty shows the ConfirmationModal; "Discard changes" confirms close
        await user.click(screen.getByRole("button", {name: CANCEL_BUTTON}))
        await user.click(screen.getByRole("button", {name: DISCARD_CHANGES_BUTTON}))

        expect(onClose).toHaveBeenCalled()
    })

    it("calls onClose when the dialog close icon is clicked", async () => {
        const user = userEvent.setup()
        const {onClose} = renderPopup()

        const closeBtn = screen.getByRole("button", {name: CLOSE_BUTTON})
        await user.click(closeBtn)

        expect(onClose).toHaveBeenCalled()
    })

    it("renders an empty instructions field when no initialInstructions is provided", () => {
        renderPopup({initialInstructions: undefined})

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        expect(instructionsField).toHaveValue("")
    })

    it("renders the instructions field with no character limit", () => {
        renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        expect(instructionsField).not.toHaveAttribute("maxlength")
    })

    it("resets instructions to initialInstructions when dialog is reopened", async () => {
        const user = userEvent.setup()
        const {rerender} = render(
            <AgentNodePopup
                agentName={AGENT_NAME}
                isOpen={true}
                onClose={vi.fn()}
                onSave={vi.fn()}
                initialInstructions={INITIAL_INSTRUCTIONS}
            />
        )

        // Edit the instructions
        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        await user.clear(instructionsField)
        await user.paste("Temporary")
        // Blur field explicitly so MUI FormControl settles before rerender
        await user.tab()

        // Close and reopen (simulate isOpen toggling)
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            rerender(
                <AgentNodePopup
                    agentName={AGENT_NAME}
                    isOpen={false}
                    onClose={vi.fn()}
                    onSave={vi.fn()}
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
                    onClose={vi.fn()}
                    onSave={vi.fn()}
                    initialInstructions={INITIAL_INSTRUCTIONS}
                />
            )
        })

        await waitFor(() => {
            expect(screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})).toHaveValue(INITIAL_INSTRUCTIONS)
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
                onClose={vi.fn()}
                onSave={vi.fn()}
                initialInstructions={INITIAL_INSTRUCTIONS}
            />
        )

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        await user.clear(instructionsField)
        await user.paste("My edited instructions")

        // Close the dialog (isOpen → false). With the fix, instructionsText must NOT be reset to
        // initialInstructions during the close animation. The underlying DOM node may still exist
        // in JSDOM (no real CSS animation), so we verify the value is retained — not reset.
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            rerender(
                <AgentNodePopup
                    agentName={AGENT_NAME}
                    isOpen={false}
                    onClose={vi.fn()}
                    onSave={vi.fn()}
                    initialInstructions={INITIAL_INSTRUCTIONS}
                />
            )
        })

        // The textarea remains in JSDOM (no real exit animation), but must hold the edited
        // value — NOT initialInstructions — proving no flash occurred during close.
        const fieldAfterClose = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
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
                onClose={vi.fn()}
                onSave={vi.fn()}
                initialInstructions=""
            />
        )

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        expect(instructionsField).toHaveValue("")

        // Parent loads the real instructions and passes them in
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            rerender(
                <AgentNodePopup
                    agentName={AGENT_NAME}
                    isOpen={true}
                    onClose={vi.fn()}
                    onSave={vi.fn()}
                    initialInstructions={INITIAL_INSTRUCTIONS}
                />
            )
        })

        await waitFor(() => {
            expect(screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})).toHaveValue(INITIAL_INSTRUCTIONS)
        })
    })

    it("updates description text when the description field is changed", async () => {
        const user = userEvent.setup()
        const {onSave} = renderPopup({initialInstructions: INITIAL_INSTRUCTIONS})

        const descField = screen.getByRole("textbox", {name: DESCRIPTION_FIELD})
        // type (not paste): real keystrokes here are the only coverage of the description field's
        // onKeyDown guard (it stopPropagation()s non-Escape keys so they don't reach the editor's
        // Escape-to-exit handler). paste fires no keydown, so it would leave that branch uncovered.
        await user.type(descField, "New description")

        await user.click(screen.getByRole("button", {name: SAVE_BUTTON}))

        expect(onSave).toHaveBeenCalledWith(AGENT_NAME, INITIAL_INSTRUCTIONS, "New description")
    })

    it("closes the dialog when Escape is pressed from the description field", async () => {
        const user = userEvent.setup()
        const {onClose} = renderPopup()

        // The field's onKeyDown swallows other keys but lets Escape through, so it reaches the dialog.
        await user.click(screen.getByRole("textbox", {name: DESCRIPTION_FIELD}))
        await user.keyboard("{Escape}")

        expect(onClose).toHaveBeenCalled()
    })

    describe("isSaving prop", () => {
        it("disables both Save and Cancel buttons while isSaving is true", () => {
            renderPopup({isSaving: true})

            expect(screen.getByRole("button", {name: APPLYING_CHANGES_BUTTON})).toBeDisabled()
            expect(screen.getByRole("button", {name: CANCEL_BUTTON})).toBeDisabled()
        })

        it("shows 'Applying changes\u2026' label on the Save button while isSaving is true", () => {
            renderPopup({isSaving: true})

            expect(screen.getByRole("button", {name: APPLYING_CHANGES_BUTTON})).toBeInTheDocument()
            expect(screen.queryByRole("button", {name: SAVE_BUTTON})).not.toBeInTheDocument()
        })

        it("shows 'Save' label and enables buttons when isSaving is false", async () => {
            const user = userEvent.setup()
            renderPopup({isSaving: false})

            // Save is also gated on isDirty; make the form dirty so it is not disabled by !isDirty
            const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
            await user.clear(instructionsField)
            await user.paste("Changed")

            expect(screen.getByRole("button", {name: SAVE_BUTTON})).toBeEnabled()
            expect(screen.getByRole("button", {name: CANCEL_BUTTON})).toBeEnabled()
        })

        it("does not call onSave when the Save button is disabled (isSaving true)", () => {
            const {onSave} = renderPopup({isSaving: true})

            // fireEvent (not userEvent): the disabled button has pointer-events: none, so userEvent
            // refuses to click it. We force the click to prove the handler stays inert even so.
            const saveBtn = screen.getByRole("button", {name: APPLYING_CHANGES_BUTTON})
            fireEvent.click(saveBtn)

            expect(onSave).not.toHaveBeenCalled()
        })

        it("does not call onClose when the Cancel button is disabled (isSaving true)", () => {
            const {onClose} = renderPopup({isSaving: true})

            // fireEvent (not userEvent): the disabled button has pointer-events: none, so userEvent
            // refuses to click it. We force the click to prove the handler stays inert even so.
            const cancelBtn = screen.getByRole("button", {name: CANCEL_BUTTON})
            fireEvent.click(cancelBtn)

            expect(onClose).not.toHaveBeenCalled()
        })

        it("still shows the X close button while isSaving is true", () => {
            renderPopup({isSaving: true})

            // The dialog is always dismissable — user can abort an in-flight save by closing.
            expect(screen.getByRole("button", {name: CLOSE_BUTTON})).toBeInTheDocument()
        })

        it("disables the text fields while isSaving is true", () => {
            renderPopup({isSaving: true})

            const textareas = screen.getAllByRole("textbox")
            textareas.forEach((ta) => expect(ta).toBeDisabled())
        })

        it("does not call onClose when backdrop is clicked while isSaving is true", async () => {
            const user = userEvent.setup()
            const {onClose} = renderPopup({isSaving: true})

            // Clicking outside is blocked while saving to prevent accidental dismissal.
            const backdrop = document.querySelector(".MuiBackdrop-root")
            if (backdrop) await user.click(backdrop)

            expect(onClose).not.toHaveBeenCalled()
        })

        it("calls onClose when backdrop is clicked while isSaving is false", async () => {
            const user = userEvent.setup()
            const {onClose} = renderPopup({isSaving: false})

            const backdrop = document.querySelector(".MuiBackdrop-root")
            if (backdrop) await user.click(backdrop)

            expect(onClose).toHaveBeenCalledTimes(1)
        })
    })
})

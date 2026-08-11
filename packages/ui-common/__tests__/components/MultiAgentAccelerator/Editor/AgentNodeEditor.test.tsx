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
import {userEvent, UserEvent} from "@testing-library/user-event"

import {makeTempNetwork} from "../../../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {
    AgentNodeEditor,
    AgentNodeEditorProps,
} from "../../../../components/MultiAgentAccelerator/Editor/AgentNodeEditor"
import {useTempNetworksStore} from "../../../../state/TemporaryNetworks"

const AGENT_NAME = "Audit Risk Manager"
const INITIAL_INSTRUCTIONS = "Evaluate operational risks and detect anomalies."

// Accessible names of the dialog's fields and buttons. These are the full accessible names, so
// getByRole's `name` string option matches them exactly — no regex needed.
const APPLYING_CHANGES_BUTTON = "Applying changes..."
const CANCEL_BUTTON = "Cancel"
// MUIDialog's "dismiss" icon uses aria-label="close" (lowercase).
const CLOSE_BUTTON = "close"
const DESCRIPTION_FIELD = "Description"
const DISCARD_CHANGES_BUTTON = "Discard changes"
const INSTRUCTIONS_FIELD = "Instructions"
// "Instructions" field placeholder — used to detect the field is absent when the dialog is closed.
const INSTRUCTIONS_PLACEHOLDER = "Enter instructions for this agent…"
const SAVE_BUTTON = "Save"
const NETWORK_ID = "TEST_NETWORK_ID"
const NETWORK_NAME = "Test network name"
const AGENT_ID = "TEST_AGENT_ID"

const renderPopup = (overrides: Partial<AgentNodeEditorProps> = {}) => {
    const props: AgentNodeEditorProps = {
        agentId: AGENT_ID,
        agentName: AGENT_NAME,
        initialInstructions: INITIAL_INSTRUCTIONS,
        isOpen: true,
        networkId: NETWORK_ID,
        onSaveAgent: vi.fn<AgentNodeEditorProps["onSaveAgent"]>().mockResolvedValue(undefined),
        setIsPopupOpen: vi.fn(),
        ...overrides,
    }

    render(<AgentNodeEditor {...props} />)

    return props
}

describe("AgentNodeEditor", () => {
    withStrictMocks()

    let user: UserEvent

    beforeEach(() => {
        useTempNetworksStore.getState().setTempNetworks([])
        user = userEvent.setup()
    })

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
        renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        await user.clear(instructionsField)
        await user.paste("New instructions")

        expect(instructionsField).toHaveValue("New instructions")
    })

    it("handles Save being clicked correctly", async () => {
        const network = makeTempNetwork(NETWORK_ID, [{origin: AGENT_ID, tools: []}], NETWORK_NAME)
        useTempNetworksStore.getState().setTempNetworks([network])

        const {onSaveAgent} = renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        await user.clear(instructionsField)

        const updatedInstructions = "Updated instructions text"
        await user.paste(updatedInstructions)

        await user.click(screen.getByRole("button", {name: SAVE_BUTTON}))

        // Make sure onSaveAgent was called with the updated instructions
        expect(onSaveAgent).toHaveBeenCalledExactlyOnceWith(
            AGENT_NAME,
            [
                {
                    description: "",
                    instructions: updatedInstructions,
                    origin: AGENT_ID,
                    tools: [],
                },
            ],
            NETWORK_NAME,
            expect.any(AbortSignal)
        )

        // Make sure temporary network store was updated with new instructions
        expect(useTempNetworksStore.getState().tempNetworks[0].agentNetworkDefinition).toStrictEqual([
            {
                description: "",
                instructions: updatedInstructions,
                origin: AGENT_ID,
                tools: [],
            },
        ])
    })

    it("Closes popup and resets instructions to initial value when Cancel is clicked", async () => {
        const {onSaveAgent, setIsPopupOpen} = renderPopup()

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        await user.clear(instructionsField)
        await user.paste("Temporary edit")

        await user.click(screen.getByRole("button", {name: CANCEL_BUTTON}))
        await user.click(screen.getByRole("button", {name: DISCARD_CHANGES_BUTTON}))

        expect(onSaveAgent).not.toHaveBeenCalled()
        expect(setIsPopupOpen).toHaveBeenCalledExactlyOnceWith(false)
        expect(screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})).toHaveValue(INITIAL_INSTRUCTIONS)
    })

    it("calls onClose when the dialog close icon is clicked", async () => {
        const {setIsPopupOpen} = renderPopup()

        const closeBtn = screen.getByRole("button", {name: CLOSE_BUTTON})
        await user.click(closeBtn)

        expect(setIsPopupOpen).toHaveBeenCalledTimes(1)
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
        const {rerender} = render(
            <AgentNodeEditor
                agentName={AGENT_NAME}
                isOpen={true}
                agentId="TEST_AGENT_ID"
                networkId="TEST_NETWORK_ID"
                onSaveAgent={vi.fn()}
                initialInstructions={INITIAL_INSTRUCTIONS}
                setIsPopupOpen={vi.fn()}
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
                <AgentNodeEditor
                    agentName={AGENT_NAME}
                    isOpen={false}
                    onSaveAgent={vi.fn()}
                    initialInstructions={INITIAL_INSTRUCTIONS}
                    agentId="TEST_AGENT_ID"
                    networkId="TEST_NETWORK_ID"
                    setIsPopupOpen={vi.fn()}
                />
            )
        })
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            rerender(
                <AgentNodeEditor
                    agentName={AGENT_NAME}
                    isOpen={true}
                    onSaveAgent={vi.fn()}
                    initialInstructions={INITIAL_INSTRUCTIONS}
                    agentId="TEST_AGENT_ID"
                    networkId="TEST_NETWORK_ID"
                    setIsPopupOpen={vi.fn()}
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
        const {rerender} = render(
            <AgentNodeEditor
                agentName={AGENT_NAME}
                isOpen={true}
                onSaveAgent={vi.fn()}
                agentId="TEST_AGENT_ID"
                networkId="TEST_NETWORK_ID"
                initialInstructions={INITIAL_INSTRUCTIONS}
                setIsPopupOpen={vi.fn()}
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
                <AgentNodeEditor
                    agentName={AGENT_NAME}
                    isOpen={false}
                    onSaveAgent={vi.fn()}
                    initialInstructions={INITIAL_INSTRUCTIONS}
                    agentId="TEST_AGENT_ID"
                    networkId="TEST_NETWORK_ID"
                    setIsPopupOpen={vi.fn()}
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
            <AgentNodeEditor
                agentName={AGENT_NAME}
                isOpen={true}
                agentId="TEST_AGENT_ID"
                networkId="TEST_NETWORK_ID"
                onSaveAgent={vi.fn()}
                initialInstructions=""
                setIsPopupOpen={vi.fn()}
            />
        )

        const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
        expect(instructionsField).toHaveValue("")

        // Parent loads the real instructions and passes them in
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            rerender(
                <AgentNodeEditor
                    agentName={AGENT_NAME}
                    isOpen={true}
                    agentId="TEST_AGENT_ID"
                    networkId="TEST_NETWORK_ID"
                    onSaveAgent={vi.fn()}
                    initialInstructions={INITIAL_INSTRUCTIONS}
                    setIsPopupOpen={vi.fn()}
                />
            )
        })

        await waitFor(() => {
            expect(screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})).toHaveValue(INITIAL_INSTRUCTIONS)
        })
    })

    it("updates description text when the description field is changed", async () => {
        const network = makeTempNetwork(NETWORK_ID, [{origin: AGENT_ID, tools: []}], NETWORK_NAME)
        useTempNetworksStore.getState().setTempNetworks([network])

        const {onSaveAgent} = renderPopup({initialInstructions: INITIAL_INSTRUCTIONS})

        const descField = screen.getByRole("textbox", {name: DESCRIPTION_FIELD})

        const updatedDescription = "New description"
        await user.type(descField, updatedDescription)

        await user.click(screen.getByRole("button", {name: SAVE_BUTTON}))

        expect(onSaveAgent).toHaveBeenCalledExactlyOnceWith(
            AGENT_NAME,
            [
                {
                    description: updatedDescription,
                    instructions: INITIAL_INSTRUCTIONS,
                    origin: AGENT_ID,
                    tools: [],
                },
            ],
            NETWORK_NAME,
            expect.any(AbortSignal)
        )
    })

    it("closes the dialog when Escape is pressed from the description field", async () => {
        const {setIsPopupOpen} = renderPopup()

        // The field's onKeyDown swallows other keys but lets Escape through, so it reaches the dialog.
        await user.click(screen.getByRole("textbox", {name: DESCRIPTION_FIELD}))
        await user.keyboard("{Escape}")

        expect(setIsPopupOpen).toHaveBeenCalledExactlyOnceWith(false)
    })

    describe("'Saving' state", () => {
        let resolveSave: (() => void) | undefined

        const renderSavingPopup = () => {
            const onSaveAgent = vi.fn<AgentNodeEditorProps["onSaveAgent"]>(
                () =>
                    new Promise<void>((resolve) => {
                        resolveSave = resolve
                    })
            )

            return renderPopup({onSaveAgent})
        }

        const initiateSave = async () => {
            const instructionsField = screen.getByRole("textbox", {name: INSTRUCTIONS_FIELD})
            await user.clear(instructionsField)
            await user.paste("Changed instructions")

            await user.click(screen.getByRole("button", {name: SAVE_BUTTON}))
        }

        beforeEach(() => {
            // Prime the temporary network store with a network containing the agent, so the save can proceed.
            const network = makeTempNetwork(NETWORK_ID, [{origin: AGENT_ID, tools: []}], NETWORK_NAME)
            useTempNetworksStore.getState().setTempNetworks([network])
        })

        afterEach(async () => {
            // Clean up promise + timer after each test
            await act(async () => {
                resolveSave?.()
                await Promise.resolve()
            })

            resolveSave = undefined
        })

        it("disables both Save and Cancel buttons while save is in progress", async () => {
            renderSavingPopup()

            await initiateSave()

            expect(await screen.findByRole("button", {name: APPLYING_CHANGES_BUTTON})).toBeDisabled()
            expect(screen.getByRole("button", {name: CANCEL_BUTTON})).toBeDisabled()
        })

        it("shows 'Applying changes' label on the Save button while isSaving is true", async () => {
            renderSavingPopup()

            await initiateSave()

            await screen.findByRole("button", {name: APPLYING_CHANGES_BUTTON})
            expect(screen.queryByRole("button", {name: SAVE_BUTTON})).not.toBeInTheDocument()
        })

        it("shows 'Save' label and enables buttons when isSaving is false", async () => {
            renderPopup()

            await initiateSave()

            expect(screen.getByRole("button", {name: SAVE_BUTTON})).toBeEnabled()
            expect(screen.getByRole("button", {name: CANCEL_BUTTON})).toBeEnabled()
        })

        it("allows the user to click the X close button while save is in progress", async () => {
            const {setIsPopupOpen} = renderSavingPopup()

            await initiateSave()

            // The dialog is always dismissable — user can abort an in-flight save by closing.
            const closeButton = screen.getByRole("button", {name: CLOSE_BUTTON})
            await user.click(closeButton)

            expect(setIsPopupOpen).not.toHaveBeenCalled() // Don't close dialog if save in progress
        })

        it("disables the text fields while save is in progress", async () => {
            renderSavingPopup()

            await initiateSave()

            const textAreas = screen.getAllByRole("textbox")
            textAreas.forEach((ta) => expect(ta).toBeDisabled())
        })

        it("does not call onClose when backdrop is clicked while save is in progress", async () => {
            const {setIsPopupOpen} = renderSavingPopup()

            await initiateSave()

            // Clicking outside is blocked while saving to prevent accidental dismissal.
            const backdrop = document.querySelector(".MuiDialog-backdrop")
            expect(backdrop).not.toBeNull()

            await user.click(backdrop)

            expect(setIsPopupOpen).not.toHaveBeenCalled()
        })

        it("calls onClose when backdrop is clicked while save is not in progress", async () => {
            const {setIsPopupOpen} = renderPopup()

            // No save in progress, so clicking outside should close the dialog.
            const backdrop = document.querySelector(".MuiBackdrop-root")
            if (backdrop) await user.click(backdrop)

            expect(setIsPopupOpen).toHaveBeenCalledExactlyOnceWith(false)
        })

        it("handles missing networkID", async () => {
            const initialNetwork = makeTempNetwork(NETWORK_ID, [{origin: AGENT_ID, tools: []}], NETWORK_NAME)
            useTempNetworksStore.getState().setTempNetworks([initialNetwork])

            const {onSaveAgent, setIsPopupOpen} = renderPopup({networkId: undefined})

            await initiateSave()

            await waitFor(() => {
                expect(onSaveAgent).toHaveBeenCalledExactlyOnceWith(AGENT_NAME, [], undefined, expect.any(AbortSignal))
            })

            expect(useTempNetworksStore.getState().tempNetworks).toStrictEqual([initialNetwork])
            expect(setIsPopupOpen).toHaveBeenCalledExactlyOnceWith(false)
        })
    })
})

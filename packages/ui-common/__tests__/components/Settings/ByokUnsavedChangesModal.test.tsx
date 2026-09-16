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

import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ByokUnsavedChangesModal} from "../../../components/Settings/ByokUnsavedChangesModal"

describe("ByokUnsavedChangesModal", () => {
    withStrictMocks()

    const onDiscardMock = vi.fn()
    const onSaveMock = vi.fn()
    const id = "test-byok-unsaved-changes"

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("renders with default content and expected buttons", () => {
        render(
            <ByokUnsavedChangesModal
                id={id}
                onDiscard={onDiscardMock}
                onSave={onSaveMock}
            />
        )

        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument()
        expect(
            screen.getByText(
                "You have unsaved edits. Are you sure you want to discard your changes and close the dialog?"
            )
        ).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Discard changes"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Save changes"})).toBeInTheDocument()
    })

    it("renders with custom content when provided", () => {
        render(
            <ByokUnsavedChangesModal
                content={<p>Custom unsaved changes warning</p>}
                id={id}
                onDiscard={onDiscardMock}
                onSave={onSaveMock}
            />
        )

        expect(screen.getByText("Custom unsaved changes warning")).toBeInTheDocument()
    })

    it("does not render when isOpen is false", () => {
        render(
            <ByokUnsavedChangesModal
                id={id}
                isOpen={false}
                onDiscard={onDiscardMock}
                onSave={onSaveMock}
            />
        )

        expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument()
    })

    it("calls onDiscard when Discard changes button is clicked", async () => {
        const user = userEvent.setup()
        render(
            <ByokUnsavedChangesModal
                id={id}
                onDiscard={onDiscardMock}
                onSave={onSaveMock}
            />
        )

        const discardButton = screen.getByRole("button", {name: "Discard changes"})
        await user.click(discardButton)

        expect(onDiscardMock).toHaveBeenCalledTimes(1)
        expect(onSaveMock).not.toHaveBeenCalled()
    })

    it("calls onSave when Save changes button is clicked", async () => {
        const user = userEvent.setup()
        render(
            <ByokUnsavedChangesModal
                id={id}
                onDiscard={onDiscardMock}
                onSave={onSaveMock}
            />
        )

        const saveButton = screen.getByRole("button", {name: "Save changes"})
        await user.click(saveButton)

        expect(onSaveMock).toHaveBeenCalledTimes(1)
        expect(onDiscardMock).not.toHaveBeenCalled()
    })
})

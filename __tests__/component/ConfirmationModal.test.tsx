import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {ConfirmationModal} from "../../components/confirmationModal"

describe("ConfirmationModal", () => {
    const handleCancelMock = jest.fn()
    const handleConfirmMock = jest.fn()

    const defaultConfirmationModalComponent = (
        <ConfirmationModal
            content="confirmation-text"
            handleCancel={handleCancelMock}
            handleOk={handleConfirmMock}
            id="test-confirmation-modal"
            title="confirmation-title"
        />
    )

    const confirmationModalComponentWithoutCancel = (
        <ConfirmationModal
            content="confirmation-text"
            handleOk={handleConfirmMock}
            id="test-confirmation-modal"
            title="confirmation-title"
        />
    )

    it("should render a confirmation modal with all elements", async () => {
        render(defaultConfirmationModalComponent)

        const modalTitle = screen.getByText("confirmation-title")
        const modalText = screen.getByText("confirmation-text")
        const cancelBtn = screen.getByText("Cancel")
        const confirmBtn = screen.getByText("Confirm")

        expect(modalTitle).toBeInTheDocument()
        expect(modalText).toBeInTheDocument()
        expect(cancelBtn).toBeInTheDocument()
        expect(confirmBtn).toBeInTheDocument()
    })

    it("should not render Cancel button if handleCancel is not passed", async () => {
        render(confirmationModalComponentWithoutCancel)

        const cancelBtn = screen.queryByText("Cancel")
        expect(cancelBtn).not.toBeInTheDocument()
    })

    it("should close modal when Cancel button is clicked", async () => {
        const user = userEvent.setup()
        render(defaultConfirmationModalComponent)

        const modalText = screen.getByText("confirmation-text")
        const cancelBtn = screen.getByText("Cancel").closest("button") as HTMLElement

        expect(modalText).toBeVisible()
        await user.click(cancelBtn)

        expect(handleCancelMock).toHaveBeenCalled()
        expect(modalText).not.toBeVisible()
    })

    it("should close modal when Confirm button is clicked", async () => {
        const user = userEvent.setup()
        render(defaultConfirmationModalComponent)

        const modalText = screen.getByText("confirmation-text")
        const confirmBtn = screen.getByText("Confirm").closest("button") as HTMLElement

        expect(modalText).toBeVisible()
        await user.click(confirmBtn)

        expect(handleConfirmMock).toHaveBeenCalled()
        expect(modalText).not.toBeVisible()
    })
})

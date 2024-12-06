import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {act, render, screen} from "@testing-library/react"

import {ConfirmationModal} from "../../components/confirmationModal"

describe("ConfirmationModal", () => {
    const handleCancelMock = jest.fn()
    const handleConfirmMock = jest.fn()

    const confirmationModalComponent = (
        <ConfirmationModal
            title="confirmation-title"
            text="confirmation-text"
            handleCancel={handleCancelMock}
            handleOk={handleConfirmMock}
        />
    )
    it("should render a confirmation modal with two options", async () => {
        render(confirmationModalComponent)

        const modalTitle = screen.getByText("confirmation-title")
        const modalText = screen.getByText("confirmation-text")
        const confirmBtn = screen.getByText("Confirm")
        const cancelBtn = screen.getByText("Cancel")

        expect(modalTitle).toBeInTheDocument()
        expect(modalText).toBeInTheDocument()
        expect(confirmBtn).toBeInTheDocument()
        expect(cancelBtn).toBeInTheDocument()
    })

    it("should close modal when confirm button is clicked", async () => {
        render(confirmationModalComponent)

        const modalTitle = screen.getByText("confirmation-title")
        const confirmBtn = screen.getByText("Confirm").closest("button") as HTMLElement

        await act(async () => {
            confirmBtn.click()
        })

        expect(handleConfirmMock).toHaveBeenCalled()
        expect(modalTitle).not.toBeInTheDocument()
    })

    it("should close modal when cancel button is clicked", async () => {
        render(confirmationModalComponent)

        const modalTitle = screen.getByText("confirmation-title")
        const cancelBtn = screen.getByText("Cancel").closest("button") as HTMLElement

        await act(async () => {
            cancelBtn.click()
        })

        expect(handleCancelMock).toHaveBeenCalled()
        expect(modalTitle).not.toBeInTheDocument()
    })
})

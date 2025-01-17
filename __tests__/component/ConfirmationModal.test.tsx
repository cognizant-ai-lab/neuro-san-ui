// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {ConfirmationModal} from "../../components/confirmationModal"

describe("ConfirmationModal", () => {
    const handleCancelMock = jest.fn()
    const handleConfirmMock = jest.fn()
    const id = "test-confirmation-modal"

    const defaultConfirmationModalComponent = (
        <ConfirmationModal
            content="confirmation-text"
            handleCancel={handleCancelMock}
            handleOk={handleConfirmMock}
            id={id}
            title="confirmation-title"
        />
    )

    const confirmationModalComponentWithoutCancel = (
        <ConfirmationModal
            content="confirmation-text"
            handleOk={handleConfirmMock}
            id={id}
            title="confirmation-title"
        />
    )

    const confirmationModalComponentWithMaskCloseableFalse = (
        <ConfirmationModal
            content="confirmation-text"
            handleOk={handleConfirmMock}
            id={id}
            maskCloseable={false}
            title="confirmation-title"
        />
    )

    const confirmationModalComponentWithMaskCloseableTrue = (
        <ConfirmationModal
            content="confirmation-text"
            handleOk={handleConfirmMock}
            id={id}
            maskCloseable={true}
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

    it("should not close modal when mask is clicked and maskCloseable is false", async () => {
        const user = userEvent.setup()
        render(confirmationModalComponentWithMaskCloseableFalse)

        const modalText = screen.getByText("confirmation-text")
        const parentElement = screen.getByTestId(`${id}-confirm-main`)

        expect(modalText).toBeVisible()
        // firstChild is '.MuiBackdrop', which is the 'mask'.
        // @ts-expect-error - Have to expect TS error, even though this works as is.
        await user.click(parentElement.firstChild)
        expect(modalText).toBeVisible()
    })

    it("should close modal when body is clicked and maskCloseable is true", async () => {
        const user = userEvent.setup()
        render(confirmationModalComponentWithMaskCloseableTrue)

        const modalText = screen.getByText("confirmation-text")
        const parentElement = screen.getByTestId(`${id}-confirm-main`)

        expect(modalText).toBeVisible()
        // firstChild is '.MuiBackdrop', which is the 'mask'.
        // @ts-expect-error - Have to expect TS error, even though this works as is.
        await user.click(parentElement.firstChild)
        expect(modalText).not.toBeVisible()
    })
})

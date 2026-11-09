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

import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"
import {ComponentProps} from "react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ConfirmationModal} from "../../../components/Common/ConfirmationModal"

describe("ConfirmationModal", () => {
    withStrictMocks()

    const handleCancelMock = vi.fn()
    const handleConfirmMock = vi.fn()
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

    it("should use custom button labels", () => {
        render(
            <ConfirmationModal
                cancelBtnLabel="Nope"
                content="confirmation-content"
                handleCancel={handleCancelMock}
                handleOk={handleConfirmMock}
                id={id}
                okBtnLabel="Yep"
                title="confirmation-title"
            />
        )

        expect(screen.getByText("Nope")).toBeInTheDocument()
        expect(screen.getByText("Yep")).toBeInTheDocument()
        expect(screen.queryByText("Cancel")).not.toBeInTheDocument()
        expect(screen.queryByText("Confirm")).not.toBeInTheDocument()
    })

    it("should close without error when Confirm is clicked and no handleOk is given", async () => {
        const user = userEvent.setup()
        render(
            <ConfirmationModal
                content="confirmation-text"
                id={id}
                title="confirmation-title"
            />
        )

        await user.click(screen.getByText("Confirm").closest("button"))

        expect(screen.getByText("confirmation-text")).not.toBeVisible()
    })

    it("should call handleCancel and close when Escape is pressed", async () => {
        const user = userEvent.setup()
        render(defaultConfirmationModalComponent)

        await user.keyboard("{Escape}")

        expect(handleCancelMock).toHaveBeenCalledTimes(1)
        expect(screen.getByText("confirmation-text")).not.toBeVisible()
    })

    it("should render with the default id and title when none are provided", () => {
        render(<ConfirmationModal {...({content: "confirmation-text"} as ComponentProps<typeof ConfirmationModal>)} />)

        expect(screen.getByText("confirmation-text")).toBeInTheDocument()
    })
})

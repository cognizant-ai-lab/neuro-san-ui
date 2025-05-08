import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {MUIDialog} from "../../../components/Common/MUIDialog"
import {withStrictMocks} from "../../common/strictMocks"

describe("Dialog", () => {
    withStrictMocks()

    const onClose = jest.fn()

    it("should render Dialog title, close button, and body when open", async () => {
        render(
            <MUIDialog
                id="dialog-test"
                isOpen={true}
                onClose={onClose}
                title="Dialog Test"
            >
                Dialog Body
            </MUIDialog>
        )

        expect(screen.getByText("Dialog Test")).toBeInTheDocument()
        expect(screen.getByText("Dialog Body")).toBeInTheDocument()
    })

    it("should not render Dialog title and body when not open", async () => {
        render(
            <MUIDialog
                id="dialog-test"
                isOpen={false}
                onClose={onClose}
                title="Dialog Test"
            >
                Dialog Body
            </MUIDialog>
        )

        expect(screen.queryByText("Dialog Test")).not.toBeInTheDocument()
        expect(screen.queryByText("Dialog Body")).not.toBeInTheDocument()
    })

    it("should render Dialog footer when it is passed", async () => {
        render(
            <MUIDialog
                footer={<>Dialog Footer</>}
                id="dialog-test"
                isOpen={true}
                onClose={onClose}
                title="Dialog Test"
            >
                Dialog Body
            </MUIDialog>
        )

        expect(screen.getByText("Dialog Footer")).toBeInTheDocument()
    })

    // It would be better if we actually tested if this closes. However, the `onClose` handler is designed
    // to pass in a setter to update `isOpen`, which is not easy to test here, so we just need to check
    // if `onClose` is called.
    it("should call onClose when close icon is clicked", async () => {
        const user = userEvent.setup()
        render(
            <MUIDialog
                id="dialog-test"
                isOpen={true}
                onClose={onClose}
                title="Dialog Test"
            >
                Dialog Body
            </MUIDialog>
        )

        const closeIcon = await screen.findByTestId("dialog-test-close-icon")
        await user.click(closeIcon)
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("should not show close icon when closeable=false", async () => {
        render(
            <MUIDialog
                closeable={false}
                id="dialog-test"
                isOpen={true}
                onClose={onClose}
                title="Dialog Test"
            >
                Dialog Body
            </MUIDialog>
        )

        const closeIcon = screen.queryByTestId("dialog-test-close-icon")
        expect(closeIcon).not.toBeInTheDocument()
    })
})

import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"

import {MUIDialog} from "../../components/dialog"

describe("Dialog", () => {
    const onClose = jest.fn()

    it("should render Dialog title and body when open", async () => {
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
})

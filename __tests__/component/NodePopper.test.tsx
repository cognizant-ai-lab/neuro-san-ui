import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {fireEvent, render, screen} from "@testing-library/react"

import NodePopper from "../../components/nodepopper"

describe("Node Popper", () => {
    const mockBtnClick = jest.fn()
    const renderMockNodePopper = () => (
        <NodePopper
            buttonProps={{btnContent: "mockBtnContent", id: "btnId", onClick: mockBtnClick}}
            popperProps={{id: "popperId"}}
        >
            <div>Mock Popper </div>
        </NodePopper>
    )

    beforeAll(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).PointerEvent = MouseEvent
    })

    it("should render a popper overlay when button is clicked", async () => {
        const view = renderMockNodePopper()

        render(view)

        const addLLMButton = await screen.findByText("mockBtnContent")

        fireEvent.click(addLLMButton)

        expect(mockBtnClick).toHaveBeenCalled()
        expect(screen.getByText("Mock Popper")).toBeInTheDocument()
    })

    it("should close the popper overlay when pointer up event is triggered", async () => {
        const view = renderMockNodePopper()

        render(view)

        const addLLMButton = await screen.findByText("mockBtnContent")

        fireEvent.click(addLLMButton)
        expect(screen.getByText("Mock Popper")).toBeInTheDocument()

        fireEvent.pointerUp(document.body)
        expect(screen.queryByText("Mock Popper")).not.toBeInTheDocument()
    })
})

import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {MUIDrawer} from "../../../components/Common/MUIDrawer"
import {withStrictMocks} from "../../common/strictMocks"

// TODO: Test different anchor positions?
describe("MUIDrawer Component", () => {
    withStrictMocks()
    
    const mockOnClose = jest.fn()

    it("renders correctly with given props", () => {
        render(
            <MUIDrawer
                id="test_drawer"
                isOpen={true}
                onClose={mockOnClose}
                title="Test Drawer"
            >
                <div>Drawer Content</div>
            </MUIDrawer>
        )

        expect(screen.getByText("Test Drawer")).toBeInTheDocument()
        expect(screen.getByText("Drawer Content")).toBeInTheDocument()
        expect(screen.getByRole("button", {name: /close/iu})).toBeInTheDocument()
    })

    it("calls onClose when the close button is clicked", async () => {
        const user = userEvent.setup()
        render(
            <MUIDrawer
                id="test_drawer"
                isOpen={true}
                onClose={mockOnClose}
                title="Test Drawer"
            >
                <div>Drawer Content</div>
            </MUIDrawer>
        )

        await user.click(screen.getByRole("button", {name: /close/iu}))
        expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it("does not render when isOpen is false", () => {
        render(
            <MUIDrawer
                id="test_drawer"
                isOpen={false}
                onClose={mockOnClose}
                title="Test Drawer"
            >
                <div>Drawer Content</div>
            </MUIDrawer>
        )

        expect(screen.queryByText("Test Drawer")).not.toBeInTheDocument()
        expect(screen.queryByText("Drawer Content")).not.toBeInTheDocument()
    })
})

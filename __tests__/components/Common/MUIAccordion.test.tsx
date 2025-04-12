import {render, screen, waitFor} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {MUIAccordion} from "../../../components/Common/MUIAccordion"

describe("MUIAccordion", () => {
    const defaultProps = {
        id: "test-accordion",
        items: [
            {title: "Title 1", content: "Content 1"},
            {title: "Title 2", content: "Content 2"},
            {title: "Title 3", content: "Content 3"},
        ],
        // TODO: Could also test arrowPosition although it's more styling than
        // user experience / interaction
        arrowPosition: "left" as "left" | "right",
    }

    const defaultPropsExpandOnePanelAndFirstPanelDefault = {
        ...defaultProps,
        defaultExpandedPanelKey: 1,
        expandOnlyOnePanel: true,
    }

    const defaultPropsExpandOnePanelAndSecondPanelDefault = {
        ...defaultProps,
        defaultExpandedPanelKey: 2,
        expandOnlyOnePanel: true,
    }

    const defaultPropsExpandOnePanelAndThirdPanelDefault = {
        ...defaultProps,
        defaultExpandedPanelKey: 3,
        expandOnlyOnePanel: true,
    }

    const defaultPropsPanelTwoDisabled = {
        ...defaultProps,
        items: [
            {title: "Title 1", content: "Content 1"},
            {title: "Title 2", content: "Content 2", disabled: true},
            {title: "Title 3", content: "Content 3"},
        ],
    }

    test("renders correctly with given props", () => {
        render(<MUIAccordion {...defaultProps} />)
        expect(screen.getByText("Title 1")).toBeInTheDocument()
        expect(screen.getByText("Title 2")).toBeInTheDocument()
        expect(screen.getByText("Title 3")).toBeInTheDocument()
        expect(screen.getByText("Content 1")).toBeInTheDocument()
        expect(screen.getByText("Content 2")).toBeInTheDocument()
        expect(screen.getByText("Content 3")).toBeInTheDocument()
    })

    test("renders default panel one open", () => {
        render(<MUIAccordion {...defaultPropsExpandOnePanelAndFirstPanelDefault} />)
        expect(screen.getByText("Content 1")).toBeVisible()
        expect(screen.getByText("Content 2")).not.toBeVisible()
        expect(screen.getByText("Content 3")).not.toBeVisible()
    })

    test("renders default panel two open", () => {
        render(<MUIAccordion {...defaultPropsExpandOnePanelAndSecondPanelDefault} />)
        expect(screen.getByText("Content 1")).not.toBeVisible()
        expect(screen.getByText("Content 2")).toBeVisible()
        expect(screen.getByText("Content 3")).not.toBeVisible()
    })

    test("renders default panel three open", () => {
        render(<MUIAccordion {...defaultPropsExpandOnePanelAndThirdPanelDefault} />)
        expect(screen.getByText("Content 1")).not.toBeVisible()
        expect(screen.getByText("Content 2")).not.toBeVisible()
        expect(screen.getByText("Content 3")).toBeVisible()
    })

    test("expands and collapses panels correctly", async () => {
        const user = userEvent.setup()
        render(<MUIAccordion {...defaultPropsExpandOnePanelAndFirstPanelDefault} />)
        const title2 = screen.getByText("Title 2")
        const title3 = screen.getByText("Title 3")

        // Click to expand the second panel, first panel should collapse
        await user.click(title2)
        await waitFor(() => {
            expect(screen.getByText("Content 1")).not.toBeVisible()
        })
        await waitFor(() => {
            expect(screen.getByText("Content 2")).toBeVisible()
        })
        expect(screen.getByText("Content 3")).not.toBeVisible()

        // Click to expand the third panel, second panel should collapse
        await user.click(title3)
        expect(screen.getByText("Content 1")).not.toBeVisible()
        await waitFor(() => {
            expect(screen.getByText("Content 2")).not.toBeVisible()
        })
        await waitFor(() => {
            expect(screen.getByText("Content 3")).toBeVisible()
        })
    })

    test("handles disabled state correctly for panel two", async () => {
        const user = userEvent.setup()
        render(<MUIAccordion {...defaultPropsPanelTwoDisabled} />)
        const title2 = screen.getByText("Title 2")

        await expect(user.click(title2)).rejects.toThrow(
            "Unable to perform pointer interaction as the element inherits `pointer-events: none`"
        )

        expect(screen.getByText("Content 2")).not.toBeVisible()
    })
})

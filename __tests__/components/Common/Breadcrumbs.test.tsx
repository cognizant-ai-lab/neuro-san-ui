import {render, screen} from "@testing-library/react"

import {NeuroAIBreadcrumbs} from "../../../components/Common/breadcrumbs"

const MOCK_PATHNAME = "mockPath1/mockPath2/mockPath3/mockPath4"
jest.mock("next/navigation", () => {
    return {
        usePathname: jest.fn(() => MOCK_PATHNAME),
    }
})

describe("NeuroAIBreadcrumbs", () => {
    it("should render breadcrumbs with the correct redirect links", () => {
        render(<NeuroAIBreadcrumbs />)

        const breadcrumb1 = screen.getByText("Mock Path 1")
        const breadcrumb2 = screen.getByText("Mock Path 2")
        const breadcrumb3 = screen.getByText("Mock Path 3")
        const breadcrumb4 = screen.getByText("Mock Path 4")

        expect(breadcrumb1).toBeInTheDocument()
        expect(breadcrumb2).toBeInTheDocument()
        expect(breadcrumb3).toBeInTheDocument()
        expect(breadcrumb4).toBeInTheDocument()

        expect(breadcrumb1).toHaveAttribute("href", "/mockPath1")
        expect(breadcrumb2).toHaveAttribute("href", "/mockPath1/mockPath2")
        expect(breadcrumb3).toHaveAttribute("href", "/mockPath1/mockPath2/mockPath3")
        // last element in breadcrumb is not a link
        expect(breadcrumb4).not.toHaveAttribute("href")
    })
})

// eslint-disable-next-line no-shadow
import {render, screen, waitFor} from "@testing-library/react"
import {default as userEvent} from "@testing-library/user-event"

import {OpportunityFinder} from "../../components/internal/opportunity_finder/opportunity_finder"

// mock useSession
jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: "testUser"}}})),
    }
})

describe("OpportunityFinder", () => {
    let user
    beforeEach(() => {
        user = userEvent.setup()
    })

    it("Should render correctly", () => {
        render(<OpportunityFinder />)

        // Agent buttons
        expect(screen.getByText("Opportunity Finder")).toBeInTheDocument()
        expect(screen.getByText("Scoping Agent")).toBeInTheDocument()
        expect(screen.getByText("Data Generator")).toBeInTheDocument()
        expect(screen.getByText("Orchestrator")).toBeInTheDocument()
    })

    it("Should allow selecting enabled agents", async () => {
        render(<OpportunityFinder />)

        // Locate buttons
        const opportunityFinderButton = screen.getByText("Opportunity Finder")
        const scopingAgentButton = screen.getByText("Scoping Agent")
        const dataGeneratorButton = screen.getByText("Data Generator")
        const orchestratorButton = screen.getByText("Orchestrator")

        // Click on the Scoping Agent button
        user.click(scopingAgentButton)

        // Check that the Scoping Agent button is selected
        await waitFor(() => {
            expect(scopingAgentButton).toHaveStyle({
                backgroundColor: "var(--bs-secondary-blue)",
                borderColor: "var(--bs-primary)",
            })
        })

        // Other agents should be unselected
        ;[dataGeneratorButton, opportunityFinderButton, orchestratorButton].forEach((button) => {
            expect(button).toHaveStyle({
                backgroundColor: null,
                borderColor: null,
            })
        })
    })
})

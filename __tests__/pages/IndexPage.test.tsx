import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"
import {useRouter} from "next/router"

import {ALL_BUILD_TARGET} from "../../const"
import Index from "../../pages/index"
import useEnvironmentStore from "../../state/environment"
import useFeaturesStore from "../../state/features"

// Mock dependencies
jest.mock("../../state/features", () => ({
    ...jest.requireActual("../../state/features"),
    __esModule: true,
    default: jest.fn(() => ({enableProjectSharing: true})),
}))

jest.mock("../../state/environment", () => ({
    __esModule: true,
    default: jest.fn(),
}))

jest.mock("next/router", () => ({
    __esModule: true,
    useRouter: jest.fn(),
}))

describe("Index Page", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(useFeaturesStore as unknown as jest.Mock).mockReturnValue({isGeneric: false})
        ;(useEnvironmentStore as unknown as jest.Mock).mockReturnValue({
            buildTarget: ALL_BUILD_TARGET,
            supportEmailAddress: "support@example.com",
        })
        ;(useRouter as jest.Mock).mockReturnValue({
            query: {key: "value"},
        })
    })

    it("renders the page correctly", () => {
        render(<Index />)

        expect(screen.getByText("Neuro AI")).toBeInTheDocument()
        expect(screen.getByText("The AI platform for smarter business decisions.")).toBeInTheDocument()
        expect(screen.getByText("Opportunity Finder")).toBeInTheDocument()
        expect(screen.getByText("Model Orchestrator")).toBeInTheDocument()
        expect(screen.getByText("Multi-Agent Accelerator")).toBeInTheDocument()
    })

    it("renders the generic branding when isGeneric is true", () => {
        ;(useFeaturesStore as unknown as jest.Mock).mockReturnValue({isGeneric: true})
        render(<Index />)

        expect(screen.getByText("Autopilot")).toBeInTheDocument()
    })

    it("opens the email dialog when 'Contact Us' is clicked", async () => {
        const user = userEvent.setup()
        render(<Index />)

        await user.click(screen.getByText("Contact Us"))
        expect(screen.getByText("Confirm")).toBeInTheDocument()
        expect(screen.getByText("Cancel")).toBeInTheDocument()
    })

    it("closes the email dialog when cancel is clicked", async () => {
        const user = userEvent.setup()
        render(<Index />)

        await user.click(screen.getByText("Contact Us"))
        await user.click(screen.getByText("Cancel"))
        expect(screen.queryByText("Confirm")).not.toBeInTheDocument()
    })

    it("builds the query string correctly", () => {
        render(<Index />)

        const link = screen.getByText("Opportunity Finder").closest("a")
        expect(link).toHaveAttribute("href", "/opportunityFinder?key=value")
    })
})

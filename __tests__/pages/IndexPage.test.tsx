import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"
import {useRouter} from "next/router"

import {ALL_BUILD_TARGET} from "../../const"
import Index from "../../pages/index"
import useEnvironmentStore from "../../state/environment"
import {withStrictMocks} from "../common/strictMocks"

// Mock dependencies

jest.mock("../../state/environment", () => ({
    __esModule: true,
    default: jest.fn(),
}))

jest.mock("next/router", () => ({
    __esModule: true,
    useRouter: jest.fn(),
}))

describe("Index Page", () => {
    withStrictMocks()

    beforeEach(() => {
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

        expect(screen.getByText("Neuro® AI")).toBeInTheDocument()
        expect(screen.getByText("Neuro® AI Decisioning")).toBeInTheDocument()
        expect(screen.getByText("A platform for smarter business decisions")).toBeInTheDocument()
        expect(screen.getByText("Neuro® AI Multi-Agent Accelerator")).toBeInTheDocument()
        expect(screen.getByText(/Low-code framework for rapidly agentifying your business./u)).toBeInTheDocument()
        expect(screen.getByText(/Explore more/u)).toBeInTheDocument()
        expect(screen.getByText("Find opportunities")).toBeInTheDocument()
        expect(screen.getByText("Build models")).toBeInTheDocument()
        expect(screen.getByText("Explore agent networks")).toBeInTheDocument()
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

        const link = screen.getByText("Find opportunities").closest("a")
        expect(link).toHaveAttribute("href", "/opportunityFinder?key=value")
    })
})

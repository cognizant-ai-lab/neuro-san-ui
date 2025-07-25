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

    it("renders the page correctly", async () => {
        render(<Index />)

        await screen.findByText("Neuro® AI")
        await screen.findByText("Multi-Agent Accelerator")
        await screen.findByText(/Low-code framework for rapidly agentifying your business./u)
        await screen.findByText(/Explore more/u)
        await screen.findByText("Decisioning")
        await screen.findByText("Platform")
        await screen.findByText(/for building grounded decisioning agents,/u)
        await screen.findByText("using agents.")
        await screen.findByText("About")
        await screen.findByText("Contact Us")
        await screen.findByText("AI Innovation Studios")
        await screen.findByText("Neuro IT Ops")
        await screen.findByText("Flowsource")
        await screen.findByText("Skygrade")
        await screen.findByText("Cognizant Ignition")
    })

    it("opens the email dialog when 'Contact Us' is clicked", async () => {
        const user = userEvent.setup()
        render(<Index />)

        const contactUsLink = await screen.findByText("Contact Us")
        await user.click(contactUsLink)
        await screen.findByText("Confirm")
        await screen.findByText("Cancel")
    })

    it("closes the email dialog when cancel is clicked", async () => {
        const user = userEvent.setup()
        render(<Index />)

        const contactUsLink = await screen.findByText("Contact Us")
        await user.click(contactUsLink)
        const cancelButton = await screen.findByText("Cancel")
        await user.click(cancelButton)

        expect(screen.queryByText("Confirm")).not.toBeInTheDocument()
    })

    it("builds the query string correctly", async () => {
        render(<Index />)

        const link = await screen.findByText("using agents.")
        const closestAnchor = link.closest("a")
        expect(closestAnchor).toHaveAttribute("href", "/opportunityFinder?key=value")
    })
})

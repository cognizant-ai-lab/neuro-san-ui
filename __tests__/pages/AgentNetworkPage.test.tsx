// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"
import {SnackbarProvider} from "notistack"

import AgentNetworkPage from "../../pages/agentNetwork"
import {mockFetch} from "../testUtils"

const MOCK_USER = "mock-user"

// Mock dependencies
jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: MOCK_USER}}})),
    }
})

window.fetch = mockFetch({})

const renderAgentNetworkPage = () =>
    render(
        <SnackbarProvider>
            <AgentNetworkPage />
        </SnackbarProvider>
    )

describe("Agent Network Page", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should render elements on the page and change the page on click of sidebar item", async () => {
        const user = userEvent.setup()
        renderAgentNetworkPage()

        // UI displays the elements.
        const sidebarTitle = await screen.findByText("Agent Networks")
        const bankingOpsSidebarItem = await screen.findByText("Banking Ops")
        const telcoNetworkSupportItems = await screen.findAllByText("Telco Network Support")
        let bankingOpsItems = await screen.findAllByText("Banking Ops")

        expect(sidebarTitle).toBeInTheDocument()
        expect(bankingOpsSidebarItem).toBeInTheDocument()
        // Telco Network Support is default, there should be a sidebar item and a chatbox item (2 items total).
        expect(telcoNetworkSupportItems.length).toBe(2)
        // Banking Ops should only have 1 sidebar item.
        expect(bankingOpsItems.length).toBe(1)

        // Click Banking Ops sidebar item
        await user.click(bankingOpsSidebarItem)
        // Banking Ops is selected now. There should be a sidebar item and a chatbox item (2 items total).
        bankingOpsItems = await screen.findAllByText("Banking Ops")
        expect(bankingOpsItems.length).toBe(2)
    })
})

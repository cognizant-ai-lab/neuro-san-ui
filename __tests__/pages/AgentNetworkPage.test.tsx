import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"
import {useSession} from "next-auth/react"
import {SnackbarProvider} from "notistack"

import AgentNetworkPage from "../../pages/agentNetwork"
import useEnvironmentStore from "../../state/environment"
import {withStrictMocks} from "../common/strictMocks"
import {mockFetch} from "../testUtils"

const MOCK_USER = "mock-user"

// Backend neuro-san API server to use
const NEURO_SAN_SERVER_URL = "https://neuro-san-dev.decisionai.ml"

const TEST_AGENT_MATH_GUY = "Math Guy"
const TEST_AGENT_MUSIC_NERD = "Music Nerd"

const mockUseSession = useSession as jest.Mock

// Mock dependencies
jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: MOCK_USER}}})),
    }
})

// Mock fetchRuns
jest.mock("../../controller/agent/Agent", () => ({
    getAgentNetworks: jest.fn(() => Promise.resolve([TEST_AGENT_MATH_GUY, TEST_AGENT_MUSIC_NERD])),
    getConnectivity: jest.fn(() =>
        Promise.resolve({
            connectivity_info: [
                {
                    origin: "date_time_provider",
                    tools: ["current_date_time"],
                },
                {
                    origin: "current_date_time",
                },
            ],
        })
    ),
}))

window.fetch = mockFetch({})

const renderAgentNetworkPage = () =>
    render(
        <SnackbarProvider>
            <AgentNetworkPage />
        </SnackbarProvider>
    )

describe("Agent Network Page", () => {
    withStrictMocks()

    beforeAll(() => {
        process.env.NEURO_SAN_SERVER_URL = NEURO_SAN_SERVER_URL
        useEnvironmentStore.getState().setBackendNeuroSanApiUrl(NEURO_SAN_SERVER_URL)
    })

    beforeEach(() => {
        mockUseSession.mockReturnValue({data: {user: {name: MOCK_USER}}})

        const mockGetAgentNetworks = jest.requireMock("../../controller/agent/Agent").getAgentNetworks
        mockGetAgentNetworks.mockResolvedValue([TEST_AGENT_MATH_GUY, TEST_AGENT_MUSIC_NERD])

        const mockGetConnectivity = jest.requireMock("../../controller/agent/Agent").getConnectivity
        mockGetConnectivity.mockResolvedValue({
            connectivity_info: [
                {
                    origin: "date_time_provider",
                    tools: ["current_date_time"],
                },
                {
                    origin: "current_date_time",
                },
            ],
        })
    })

    afterAll(() => delete process.env.NEURO_SAN_SERVER_URL)

    it("should render elements on the page and change the page on click of sidebar item", async () => {
        const user = userEvent.setup()
        renderAgentNetworkPage()

        // UI displays the elements.
        const sidebarTitle = await screen.findByText("Agent Networks")
        // Get Music Nerd item.
        const musicNerdItem = await screen.findByText(TEST_AGENT_MUSIC_NERD)
        // Get Math Guy items.
        const mathGuyItems = await screen.findAllByText(TEST_AGENT_MATH_GUY)
        // Get Music Nerd items (is overriden by a second query below).
        let musicNerdItems = await screen.findAllByText(TEST_AGENT_MUSIC_NERD)

        // Check that the sidebar title is present.
        expect(sidebarTitle).toBeInTheDocument()

        // Math Guy is default, there should be a sidebar item and a chatbox item (2 items total).
        expect(mathGuyItems.length).toBe(2)
        expect(musicNerdItem).toBeInTheDocument()
        // Music Nerd should only have 1 sidebar item.
        expect(musicNerdItems.length).toBe(1)

        // Click Music Nerd sidebar item
        await user.click(musicNerdItem)
        // Music Nerd is selected now. There should be a sidebar item and a chatbox item (2 items total).n
        musicNerdItems = await screen.findAllByText(TEST_AGENT_MUSIC_NERD)
        expect(musicNerdItems.length).toBe(2)
    })
})

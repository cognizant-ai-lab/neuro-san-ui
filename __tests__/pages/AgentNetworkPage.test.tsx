import {render, screen, waitFor} from "@testing-library/react"
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

        // Ensure Math Guy (default network) elements are rendered.
        // Should be 2 Math Guy items (1 in sidebar, 1 in chat window)
        await waitFor(() => {
            expect(screen.getAllByText(TEST_AGENT_MATH_GUY)).toHaveLength(2)
        })

        // Find sidebar. Will fail if <> 1 found
        await screen.findByText("Agent Networks")

        // Ensure Music Nerd is initially shown once. Will fail if <> 1 found
        const musicNerdItem = await screen.findByText(TEST_AGENT_MUSIC_NERD)

        // Click Music Nerd sidebar item
        await user.click(musicNerdItem)

        // Music Nerd is selected now. There should be a sidebar item and a chatbox item (2 items total)
        await waitFor(() => {
            expect(screen.getAllByText(TEST_AGENT_MUSIC_NERD)).toHaveLength(2)
        })
    })
})

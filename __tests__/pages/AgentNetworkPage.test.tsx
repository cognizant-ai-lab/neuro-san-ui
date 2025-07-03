import {render, screen, waitFor} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {useSession} from "next-auth/react"
import {SnackbarProvider} from "notistack"
import {forwardRef, Ref} from "react"

import AgentNetworkPage from "../../pages/agentNetwork"
import useEnvironmentStore from "../../state/environment"
import {withStrictMocks} from "../common/strictMocks"
import {mockFetch} from "../testUtils"

const MOCK_USER = "mock-user"

// Backend neuro-san API server to use
const NEURO_SAN_SERVER_URL = "https://default.example.com"

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

// Mock ChatCommon component
const chatCommonMock = jest.fn()

// Mock ChatCommon to call the mock function with props and support refs
jest.mock("../../components/AgentChat/ChatCommon", () => ({
    ChatCommon: forwardRef((props: Record<string, unknown>, ref) => {
        chatCommonMock(props)
        return (
            <div
                id="test-chat-common"
                ref={ref as Ref<HTMLDivElement>}
            />
        )
    }),
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

    let user: UserEvent

    beforeAll(() => {
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

        user = userEvent.setup()
    })

    it("should render elements on the page and change the page on click of sidebar item", async () => {
        renderAgentNetworkPage()

        // Ensure Math Guy (default network) element is rendered.
        await waitFor(() => {
            expect(screen.getAllByText(TEST_AGENT_MATH_GUY)).toHaveLength(1)
        })

        // Find sidebar. Will fail if <> 1 found
        await screen.findByText("Agent Networks")

        // Ensure Music Nerd is initially shown once. Will fail if <> 1 found
        const musicNerdItem = await screen.findByText(TEST_AGENT_MUSIC_NERD)

        // Click Music Nerd sidebar item
        await user.click(musicNerdItem)

        // Music Nerd is selected now. Make sure we see it.
        await waitFor(() => {
            expect(screen.getAllByText(TEST_AGENT_MUSIC_NERD)).toHaveLength(1)
        })

        // Make sure the page rendered ChatCommon with expected props
        expect(chatCommonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                currentUser: MOCK_USER,
                targetAgent: TEST_AGENT_MATH_GUY,
                clearChatOnNewAgent: true,
                neuroSanURL: NEURO_SAN_SERVER_URL,
            })
        )
    })

    it("should display error toast when an error occurs for getAgentNetworks", async () => {
        const debugSpy = jest.spyOn(console, "debug").mockImplementation()
        // Mock getAgentNetworks to reject with an error
        const mockGetAgentNetworks = jest.requireMock("../../controller/agent/Agent").getAgentNetworks
        mockGetAgentNetworks.mockRejectedValueOnce(new Error("Failed to fetch agent networks"))

        renderAgentNetworkPage()

        // Assert the console.debug call
        await waitFor(() => {
            expect(debugSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    // eslint-disable-next-line max-len
                    `"Unable to get list of Agent Networks. Verify that ${NEURO_SAN_SERVER_URL} is a valid Multi-Agent Accelerator Server. Error: Error: Failed to fetch agent networks."`
                )
            )
        })
    })

    it("should display error toast when an error occurs for getConnectivity", async () => {
        const debugSpy = jest.spyOn(console, "debug").mockImplementation()
        // Mock getAgentNetworks to reject with an error
        const mockGetAgentNetworks = jest.requireMock("../../controller/agent/Agent").getConnectivity
        mockGetAgentNetworks.mockRejectedValueOnce(new Error("Failed to fetch connectivity"))

        renderAgentNetworkPage()

        // Assert the console.debug call
        await waitFor(() => {
            expect(debugSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    // eslint-disable-next-line max-len
                    `"Unable to get agent list for "${TEST_AGENT_MATH_GUY}". Verify that ${NEURO_SAN_SERVER_URL} is a valid Multi-Agent Accelerator Server. Error: Error: Failed to fetch connectivity."`
                )
            )
        })
    })
})

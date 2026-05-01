/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {useColorScheme} from "@mui/material/styles"
import {act, render, screen, waitFor, within} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {useSession} from "next-auth/react"
import {SnackbarProvider} from "notistack"
import {Ref} from "react"

import {
    LIST_NETWORKS_RESPONSE,
    TEMPORARY_NETWORK,
    TEST_AGENT_MATH_GUY,
    TEST_AGENT_MATH_GUY_DISPLAY,
    TEST_AGENT_MUSIC_NERD,
    TEST_AGENT_MUSIC_NERD_DISPLAY,
    TEST_AGENTS_FOLDER,
    TEST_AGENTS_FOLDER_DISPLAY,
} from "../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../__tests__/common/TestUtils"
import {
    ChatCommonHandle,
    ChatCommonProps,
} from "../../../../packages/ui-common/components/AgentChat/ChatCommon/ChatCommon"
import {cleanUpAgentName} from "../../../../packages/ui-common/components/AgentChat/Common/Utils"
import {extractConversations} from "../../../../packages/ui-common/components/MultiAgentAccelerator/AgentConversations"
import {AgentFlowProps} from "../../../../packages/ui-common/components/MultiAgentAccelerator/AgentFlow"
import {
    AGENT_NETWORK_DESIGNER_ID,
    AGENT_NETWORK_HOCON,
    AGENT_PROGRESS_CONNECTIVITY_KEY,
    AGENT_RESERVATIONS_KEY,
    TEMPORARY_NETWORK_FOLDER,
} from "../../../../packages/ui-common/components/MultiAgentAccelerator/const"
import {GRACE_PERIOD_MS} from "../../../../packages/ui-common/components/MultiAgentAccelerator/MultiAgentAccelerator"
import {SidebarProps} from "../../../../packages/ui-common/components/MultiAgentAccelerator/Sidebar/Sidebar"
import {
    getAgentNetworks,
    getNetworkIconSuggestions,
    testConnection,
} from "../../../../packages/ui-common/controller/agent/Agent"
import {
    ChatMessageType,
    ChatResponse,
    ConnectivityInfo,
} from "../../../../packages/ui-common/generated/neuro-san/NeuroSanClient"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/Environment"
import {useSettingsStore} from "../../../../packages/ui-common/state/Settings"
import {TemporaryNetwork, useTempNetworksStore} from "../../../../packages/ui-common/state/TemporaryNetworks"
import {UserInfoStore} from "../../../../packages/ui-common/state/UserInfo"
import MultiAgentAcceleratorPage from "../../pages/multiAgentAccelerator"

const MOCK_USER = "mock-user"

// Backend neuro-san API server to use
const NEURO_SAN_SERVER_URL = "https://default.example.com"

const mockUseSession = useSession as jest.Mock

// Mock dependencies
jest.mock("next-auth/react")

jest.mock("../../../../packages/ui-common/controller/agent/Agent")

const conversationMock = jest.fn()
const temporaryNetworksMock = jest.fn()
const networkIconSuggestionsMock = jest.fn()
let onDeleteNetwork: (a: string, b: boolean) => void
let setSelectedNetwork: (network: string) => void

jest.mock("../../../../packages/ui-common/components/MultiAgentAccelerator/AgentFlow", () => ({
    __esModule: true,
    AgentFlow: (props: AgentFlowProps) => {
        conversationMock(props.currentConversations)
        return (
            <div data-testid="mock-agent-flow">
                {props.agentsInNetwork.map((element) => {
                    const json = JSON.stringify(element)
                    return <div key={json}>{json}</div>
                })}
            </div>
        )
    },
}))

jest.mock("../../../../packages/ui-common/components/MultiAgentAccelerator/Sidebar/Sidebar", () => {
    const originalModule = jest.requireActual(
        "../../../../packages/ui-common/components/MultiAgentAccelerator/Sidebar/Sidebar"
    )
    return {
        __esModule: true,
        Sidebar: (props: SidebarProps) => {
            temporaryNetworksMock(props.temporaryNetworks)
            networkIconSuggestionsMock(props.networkIconSuggestions)
            onDeleteNetwork = props.onDeleteNetwork
            setSelectedNetwork = props.setSelectedNetwork
            const OriginalSidebar = originalModule.Sidebar
            return <OriginalSidebar {...props} />
        },
    }
})

jest.mock("../../../../packages/ui-common/components/MultiAgentAccelerator/AgentConversations")

// Mock MUI theming
jest.mock("@mui/material/styles", () => ({
    ...jest.requireActual("@mui/material/styles"),
    useColorScheme: jest.fn(),
}))

jest.mock("../../../../packages/ui-common/state/UserInfo", () => ({
    __esModule: true,
    useUserInfoStore: (): Partial<UserInfoStore> => ({
        currentUser: MOCK_USER,
        picture: null,
    }),
}))

// Mock ChatCommon to call the mock function with props and support refs
const chatCommonMock = jest.fn()
const handleStopMock = jest.fn()

const MATH_GUY_MESSAGE: ChatResponse = {
    response: {
        type: ChatMessageType.AI,
        text: "This is a test message",
        origin: [{tool: TEST_AGENT_MATH_GUY}],
    },
}

const RESERVATION = TEMPORARY_NETWORK.reservation

const RESERVATION_CHAT_MESSAGE: ChatResponse = {
    response: {
        type: ChatMessageType.AGENT_FRAMEWORK,
        text: "This is a test message",
        structure: {total_tokens: 100},
        origin: [{tool: "copy_cat"}],
        sly_data: {
            [AGENT_RESERVATIONS_KEY]: [RESERVATION],
        },
    },
}

const NETWORK_HOCON_CHAT_MESSAGE: ChatResponse = {
    response: {
        ...RESERVATION_CHAT_MESSAGE.response,
        sly_data: {
            ...RESERVATION_CHAT_MESSAGE.response.sly_data,
            [AGENT_NETWORK_HOCON]: JSON.stringify(TEMPORARY_NETWORK.networkHocon, null, 2),
        },
    },
}

const CONNECTIVITY_INFO: ConnectivityInfo[] = [
    {origin: "first_origin", tools: ["some_tool"]},
    {origin: "second_origin", tools: ["some_other_tool"]},
]

const AGENT_PROGRESS_CHAT_MESSAGE: ChatResponse = {
    response: {
        type: ChatMessageType.AGENT_PROGRESS,
        structure: {
            [AGENT_PROGRESS_CONNECTIVITY_KEY]: CONNECTIVITY_INFO,
        },
    },
}

let setIsAwaitingLlm: (val: boolean) => void
let onChunkReceived: (chunk: string) => boolean
let onStreamingStarted: () => void
let onStreamingComplete: () => void

jest.mock("../../../../packages/ui-common/components/AgentChat/ChatCommon/ChatCommon", () => ({
    __esModule: true,
    ChatCommon: (props: ChatCommonProps & {ref?: Ref<ChatCommonHandle>}) => {
        chatCommonMock(props)
        setIsAwaitingLlm = props.setIsAwaitingLlm
        onChunkReceived = props.onChunkReceived
        onStreamingStarted = props.onStreamingStarted
        onStreamingComplete = props.onStreamingComplete

        // handleStop ref
        ;(props.ref as {current?: ChatCommonHandle}).current = {handleStop: handleStopMock}
        return (
            <div
                id="test-chat-common"
                data-testid="test-chat-common"
            />
        )
    },
}))

window.fetch = mockFetch({})

const renderMultiAgentAcceleratorPage = () =>
    render(
        <SnackbarProvider>
            <MultiAgentAcceleratorPage />
        </SnackbarProvider>
    )

describe("Multi Agent Accelerator Page", () => {
    withStrictMocks()

    let user: UserEvent

    beforeAll(() => {
        useEnvironmentStore.getState().setBackendNeuroSanApiUrl(NEURO_SAN_SERVER_URL)
    })

    beforeEach(() => {
        mockUseSession.mockReturnValue({data: {user: {name: MOCK_USER}}})
        ;(getAgentNetworks as jest.Mock).mockResolvedValue(LIST_NETWORKS_RESPONSE)

        const mockGetConnectivity = jest.requireMock(
            "../../../../packages/ui-common/controller/agent/Agent"
        ).getConnectivity
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
        ;(testConnection as jest.Mock).mockResolvedValue({success: true, status: "ok", version: "1.0.0"})

        // make extractConversations the real implementation
        ;(extractConversations as jest.Mock).mockImplementation(
            jest.requireActual("../../../../packages/ui-common/components/MultiAgentAccelerator/AgentConversations")
                .extractConversations
        )

        user = userEvent.setup()

        // Reset zustand stores
        useTempNetworksStore.setState({tempNetworks: []})
        useSettingsStore.getState().resetSettings()
    })

    it.each([false, true])(
        "should render elements on the page with darkMode=%s and change the page on click of sidebar item",
        async (darkMode) => {
            ;(useColorScheme as jest.Mock).mockReturnValue({
                mode: darkMode ? "dark" : "light",
            })

            renderMultiAgentAcceleratorPage()

            // click to expand networks
            const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
            await user.click(header)

            // Ensure Math Guy (default network) element is rendered.
            await screen.findByText(TEST_AGENT_MATH_GUY_DISPLAY)

            // Find sidebar. Will fail if <> 1 found
            await screen.findByText("Agent Networks")

            // Ensure Music Nerd is initially shown once. Will fail if <> 1 found
            const musicNerdItem = await screen.findByText(TEST_AGENT_MUSIC_NERD_DISPLAY)

            // Click Music Nerd sidebar item
            await user.click(musicNerdItem)

            // Music Nerd is selected now. Make sure we see it.
            await screen.findByText(TEST_AGENT_MUSIC_NERD_DISPLAY)

            // Make sure the page rendered ChatCommon with expected props
            expect(chatCommonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    currentUser: MOCK_USER,
                    targetAgent: `${TEST_AGENTS_FOLDER}/${TEST_AGENT_MUSIC_NERD}`,
                    neuroSanURL: NEURO_SAN_SERVER_URL,
                })
            )
        }
    )

    it("should display error toast when an error occurs for getAgentNetworks", async () => {
        const debugSpy = jest.spyOn(console, "debug").mockImplementation()
        // Mock getAgentNetworks to reject with an error
        const mockGetAgentNetworks = jest.requireMock(
            "../../../../packages/ui-common/controller/agent/Agent"
        ).getAgentNetworks
        mockGetAgentNetworks.mockRejectedValueOnce(new Error("Failed to fetch agent networks"))

        renderMultiAgentAcceleratorPage()

        // Assert the console.debug call
        await waitFor(() => {
            expect(debugSpy).toHaveBeenCalledWith(
                expect.stringMatching(new RegExp(`Unable to get list of Agent Networks.*${NEURO_SAN_SERVER_URL}`, "u"))
            )
        })
    })

    it("should display error toast when an error occurs for getConnectivity", async () => {
        const debugSpy = jest.spyOn(console, "debug").mockImplementation()
        // Mock getAgentNetworks to reject with an error
        const mockGetAgentNetworks = jest.requireMock(
            "../../../../packages/ui-common/controller/agent/Agent"
        ).getConnectivity
        mockGetAgentNetworks.mockRejectedValueOnce(new Error("Failed to fetch connectivity"))

        renderMultiAgentAcceleratorPage()

        // Expand networks
        const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // Select a network to trigger getConnectivity
        const network = await screen.findByText(TEST_AGENT_MATH_GUY_DISPLAY)
        await user.click(network)

        // Assert the console.error call
        await waitFor(() => {
            expect(debugSpy).toHaveBeenCalledWith(
                expect.stringMatching(
                    new RegExp(
                        "Unable to get agent list.*" +
                            `${TEST_AGENTS_FOLDER_DISPLAY} ${TEST_AGENT_MATH_GUY_DISPLAY}.*${NEURO_SAN_SERVER_URL}.*`,
                        "u"
                    )
                )
            )
        })
    })

    it("should handle Zen mode animation correctly", async () => {
        renderMultiAgentAcceleratorPage()

        await screen.findByText("Agent Networks")

        // Left panel: Make sure sidebar is visible
        await waitFor(() => {
            expect(document.getElementById("multi-agent-accelerator-sidebar-sidebar")).toBeVisible()
        })

        // Center panel: Agent Flow
        await waitFor(() => {
            expect(document.getElementById("multi-agent-accelerator-agent-flow-container")).toBeVisible()
        })

        // Right panel: Chat window
        expect(await screen.findByTestId("test-chat-common")).toBeVisible()

        // Make sure Stop button is not in document
        expect(screen.queryByLabelText("Stop")).not.toBeInTheDocument()

        // Force Zen mode by setting isAwaitingLlm to true
        await act(async () => {
            useSettingsStore.getState().updateSettings({
                behavior: {
                    enableZenMode: true,
                },
            })
        })

        await act(async () => {
            setIsAwaitingLlm(true)
        })

        // Stop button should be in document in Zen mode
        await screen.findByLabelText("Stop")

        // Left panel: should be hidden in Zen mode
        await waitFor(() => {
            expect(document.getElementById("multi-agent-accelerator-sidebar-sidebar")).not.toBeVisible()
        })

        // Center panel: Agent Flow. Should still be visible in Zen mode
        await waitFor(() => {
            expect(document.getElementById("multi-agent-accelerator-agent-flow-container")).toBeVisible()
        })

        // Right panel: Chat window should be hidden in Zen mode
        expect(await screen.findByTestId("test-chat-common")).not.toBeVisible()
    })

    it("should correctly handle Zen mode being disabled", async () => {
        // Disable Zen mode
        useSettingsStore.getState().updateSettings({behavior: {enableZenMode: false}})

        renderMultiAgentAcceleratorPage()

        screen.getByText("Agent Networks")

        await act(async () => {
            setIsAwaitingLlm(true)
        })

        // Panels should all still be visible even with isAwaitingLlm true because Zen mode is disabled
        // Left panel: should be hidden in Zen mode
        expect(document.getElementById("multi-agent-accelerator-sidebar-sidebar")).toBeVisible()

        // Center panel: Agent Flow. Should always be visible
        expect(document.getElementById("multi-agent-accelerator-agent-flow-container")).toBeVisible()

        // Right panel: Chat window should be hidden in Zen mode
        expect(await screen.findByTestId("test-chat-common")).toBeVisible()
    })

    it("calls handleStopMock on Escape key when isAwaitingLlm is true", async () => {
        renderMultiAgentAcceleratorPage()

        await act(async () => {
            setIsAwaitingLlm(true)
        })

        // Simulate Escape key
        await userEvent.keyboard("{Escape}")

        expect(handleStopMock).toHaveBeenCalledTimes(1)
    })

    it("ignores presses of keys other than Escape", async () => {
        renderMultiAgentAcceleratorPage()

        await act(async () => {
            setIsAwaitingLlm(true)
        })

        // Simulate Escape key
        await userEvent.keyboard("{Enter}")

        expect(handleStopMock).not.toHaveBeenCalled()
    })

    it("should handle receiving an agent conversation chat message", async () => {
        renderMultiAgentAcceleratorPage()

        // Simulate receiving a chat message
        const mockChunk = JSON.stringify(MATH_GUY_MESSAGE)

        await act(async () => {
            onChunkReceived(mockChunk)
        })

        expect(chatCommonMock).toHaveBeenCalled()

        // Verify the conversations array contains the expected agent
        const conversationCall = conversationMock.mock.calls[conversationMock.mock.calls.length - 1][0]
        const hasAgent = conversationCall.some((conv: {agents: Set<string>}) =>
            Array.from(conv.agents).includes(TEST_AGENT_MATH_GUY)
        )
        expect(hasAgent).toBe(true)
    })

    it("should handle receiving a bad message", async () => {
        // Make extractConversations return failure (null) for this one test to simulate a critical error
        ;(extractConversations as jest.Mock).mockReturnValue(null)

        renderMultiAgentAcceleratorPage()

        // Simulate receiving a chat message
        const mockChunk = JSON.stringify(MATH_GUY_MESSAGE)

        await act(async () => {
            onChunkReceived(mockChunk)
        })

        expect(chatCommonMock).toHaveBeenCalled()

        // Verify the conversations array contains the expected agent
        const calls = conversationMock.mock.calls

        // Assert that conversationMock was always called with an empty array (no conversations)
        // due to the failure in extractConversations
        calls.forEach((call) => {
            expect(call[0]).toEqual([])
        })
    })

    it("should handle receiving an end of conversation chat message", async () => {
        renderMultiAgentAcceleratorPage()

        // Set up one active agent
        const activeAgentChunk = JSON.stringify(MATH_GUY_MESSAGE)
        await act(async () => {
            onChunkReceived(activeAgentChunk)
        })

        // Verify the conversation mock was called
        expect(conversationMock).toHaveBeenCalled()

        // End of conversation message for unrelated agent
        const endOfConversationDifferentAgent: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT,
                text: "This is a test message",
                // One of "hints" for end of conversation is having a structure field containing total_tokens
                structure: {total_tokens: 100} as unknown as Record<string, never>,
                origin: [{tool: "Definitely not math guy"}],
            },
        }

        await act(async () => {
            onChunkReceived(JSON.stringify(endOfConversationDifferentAgent))
        })

        // Verify Math Guy is still in the conversations
        expect(conversationMock).toHaveBeenCalled()
        const latestCall = conversationMock.mock.calls[conversationMock.mock.calls.length - 1][0]
        const hasMathGuy = latestCall.some((conv: {agents: Set<string>}) => conv.agents.has(TEST_AGENT_MATH_GUY))
        expect(hasMathGuy).toBe(true)

        conversationMock.mockClear()

        // Now the end of conversation message for the active agent
        const chatMessage: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT,
                text: "This is a test message",
                structure: {total_tokens: 100},
                origin: [{tool: TEST_AGENT_MATH_GUY}],
            },
        }

        await act(async () => {
            onChunkReceived(JSON.stringify(chatMessage))
        })
    })

    describe("Agent Network Designer integration", () => {
        it("Should detect agent registrations in the chat stream", async () => {
            renderMultiAgentAcceleratorPage()

            // Set up a temporary network
            await act(async () => {
                onChunkReceived(JSON.stringify(RESERVATION_CHAT_MESSAGE))
            })

            expect(chatCommonMock).toHaveBeenCalled()

            const agentName = `${TEMPORARY_NETWORK_FOLDER}/${RESERVATION.reservation_id}`

            const expectedTemporaryNetwork: TemporaryNetwork = {
                reservation: expect.objectContaining(RESERVATION),
                agentInfo: expect.objectContaining({
                    agent_name: agentName,
                }),
                networkHocon: null,
            }

            expect(temporaryNetworksMock).toHaveBeenCalledWith([expectedTemporaryNetwork])
        })

        it("Should detect network hocon in the chat stream", async () => {
            renderMultiAgentAcceleratorPage()

            // Process the chunk with the network hocon
            await act(async () => {
                onChunkReceived(JSON.stringify(NETWORK_HOCON_CHAT_MESSAGE))
            })

            expect(temporaryNetworksMock).toHaveBeenCalledWith([
                expect.objectContaining({
                    networkHocon: NETWORK_HOCON_CHAT_MESSAGE.response.sly_data?.[AGENT_NETWORK_HOCON],
                }),
            ])
        })

        it("Should detect agent progress messages in the chat stream", async () => {
            renderMultiAgentAcceleratorPage()

            const popperTitle = "Network Preview"

            // Popover should not be displayed before selecting the network
            expect(screen.queryByText(popperTitle)).not.toBeVisible()

            await act(async () => {
                setSelectedNetwork(AGENT_NETWORK_DESIGNER_ID)
            })

            // Need to simulate starting the stream to trigger the popover for the Agent Network Designer
            jest.spyOn(console, "debug").mockImplementation()
            await act(async () => {
                onStreamingStarted()
            })

            // Popover should be displayed now we're in Agent Network Designer mode
            screen.getByText(popperTitle)

            // Process the chunk with the agent progress message
            await act(async () => {
                onChunkReceived(JSON.stringify(AGENT_PROGRESS_CHAT_MESSAGE))
            })

            // Now network progress should be displayed in the popover.
            CONNECTIVITY_INFO.forEach((info) => {
                screen.getByText(JSON.stringify(info))
            })

            // Simulate streaming end to close the popover
            await act(async () => {
                onStreamingComplete()
            })

            // Popover should be closed
            expect(screen.queryByText(popperTitle)).not.toBeVisible()
        })

        it("Should handle non-progress messages while in Agent Network Designer mode without crashing", async () => {
            renderMultiAgentAcceleratorPage()

            await act(async () => {
                setSelectedNetwork(AGENT_NETWORK_DESIGNER_ID)
            })

            // Need to simulate starting the stream to trigger the popover for the Agent Network Designer
            jest.spyOn(console, "debug").mockImplementation()
            await act(async () => {
                onStreamingStarted()
            })

            // Process the chunk with a random message
            await act(async () => {
                // Wrong message type
                onChunkReceived(JSON.stringify(MATH_GUY_MESSAGE))
            })

            // Should still say "awaiting status" in the popover because we never got a progress message
            screen.getByText(/Awaiting status.../u)

            // Right message type, even has `structure` field, but no progress info
            await act(async () => {
                // Wrong message type
                onChunkReceived(JSON.stringify(RESERVATION_CHAT_MESSAGE))
            })

            // Should still say "awaiting status" in the popover because we never got a progress message
            screen.getByText(/Awaiting status.../u)
        })

        it("Should handle deletion of temporary networks", async () => {
            renderMultiAgentAcceleratorPage()

            // Set up a temporary network
            await act(async () => {
                onChunkReceived(JSON.stringify(RESERVATION_CHAT_MESSAGE))
            })

            const expectedAgentName = `${TEMPORARY_NETWORK_FOLDER}/${RESERVATION.reservation_id}`
            await waitFor(() => {
                expect(temporaryNetworksMock).toHaveBeenCalledWith(
                    expect.arrayContaining([
                        expect.objectContaining({
                            agentInfo: expect.objectContaining({
                                agent_name: expectedAgentName,
                            }),
                        }),
                    ])
                )
            })

            temporaryNetworksMock.mockClear()

            // Simulate user deleting the temporary network
            await act(async () => onDeleteNetwork(expectedAgentName, false))

            // Should be a confirmation modal
            const modal = screen.getByTestId("delete-network-confirmation-modal-confirm-main")
            const confirmButton = within(modal).getByRole("button", {name: "Confirm"})
            await user.click(confirmButton)

            // Modal should close and temporary network should be removed
            expect(screen.queryByTestId("delete-network-confirmation-modal-confirm-main")).not.toBeInTheDocument()

            // Make sure network deleted
            expect(temporaryNetworksMock).toHaveBeenCalledWith([])
        })

        it("Should handle deleting expired temporary networks without confirmation", async () => {
            renderMultiAgentAcceleratorPage()

            // Set up a temporary network
            await act(async () => {
                onChunkReceived(JSON.stringify(RESERVATION_CHAT_MESSAGE))
            })

            const expectedAgentName = `${TEMPORARY_NETWORK_FOLDER}/${RESERVATION.reservation_id}`
            await waitFor(() => {
                expect(temporaryNetworksMock).toHaveBeenCalledWith(
                    expect.arrayContaining([
                        expect.objectContaining({
                            agentInfo: expect.objectContaining({
                                agent_name: expectedAgentName,
                            }),
                        }),
                    ])
                )
            })

            temporaryNetworksMock.mockClear()

            // Simulate user deleting the expired temporary network
            await act(async () => onDeleteNetwork(expectedAgentName, true))

            // Should delete without confirmation
            expect(screen.queryByTestId("delete-network-confirmation-modal-confirm-main")).not.toBeInTheDocument()

            // Make sure network deleted
            expect(temporaryNetworksMock).toHaveBeenCalledWith([])
        })

        it("Should handle temporary networks expiring", async () => {
            renderMultiAgentAcceleratorPage()

            // Set up a temporary network
            const expirationTimeSeconds = 60
            const reservation: TemporaryNetwork = {
                ...TEMPORARY_NETWORK,
                reservation: {
                    ...TEMPORARY_NETWORK.reservation,
                    expiration_time_in_seconds: Math.floor(Date.now() / 1000) + expirationTimeSeconds,
                },
            }

            // Simulated chat response for the temp network
            const reservationChatMessage: ChatResponse = {
                response: {
                    ...RESERVATION_CHAT_MESSAGE.response,
                    sly_data: {
                        [AGENT_RESERVATIONS_KEY]: [reservation.reservation],
                    },
                },
            }

            // Set up fake timers as the expiration logic relies on timers.
            jest.useFakeTimers({now: Date.now()})

            // Need a custom userEvent instance that works with fake timers
            const localUser = userEvent.setup({advanceTimers: jest.advanceTimersByTime.bind(jest)})

            // Feed it the temp networks chunk
            await act(async () => {
                onChunkReceived(JSON.stringify(reservationChatMessage))
            })

            // Make sure network saved to store
            expect(useTempNetworksStore.getState().tempNetworks.length).toBe(1)

            // Not expired yet so we should see the network
            const expectedNetworkName = `${TEMPORARY_NETWORK_FOLDER}/${TEMPORARY_NETWORK.reservation.reservation_id}`
            const temporaryNetworkNode = document.querySelector(`[data-itemid="${expectedNetworkName}"]`)
            expect(temporaryNetworkNode).not.toBeNull()

            const displayAgentName = cleanUpAgentName(TEMPORARY_NETWORK.reservation.reservation_id)

            // Make sure we see the temp network
            const tempNetworkItem = await screen.findByText(displayAgentName)

            // Click the network to select it
            await localUser.click(tempNetworkItem)

            // ChatCommon should be called with the selected network as the target agent -- a bit of an indirect way
            // to verify that the network was selected. There may be a more elegant way to do this.
            expect(chatCommonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    targetAgent: expectedNetworkName,
                })
            )

            // Reset mock calls so we have a clean slate
            chatCommonMock.mockClear()

            // First time "expired check" runs, it should not be expired yet
            await act(async () => {
                jest.runOnlyPendingTimers()
            })

            expect(chatCommonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    targetAgent: expectedNetworkName,
                })
            )

            chatCommonMock.mockClear()

            // advanced past expiration time but still within grace period, meaning we show the network but flag it as
            // expired and do not let the user select it
            await act(async () => {
                jest.advanceTimersByTime(expirationTimeSeconds * 1000)
            })

            // Verify network was de-selected
            expect(chatCommonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    targetAgent: null,
                })
            )

            // ...but should still be in the store since we're within the grace period
            expect(useTempNetworksStore.getState().tempNetworks.length).toBe(1)

            // Mouse over -- should get "expired" Tooltip
            await localUser.hover(tempNetworkItem)
            await screen.findByText(/Expired/u)

            // Attempt to select it. Should not be allowed since it's expired
            chatCommonMock.mockClear()
            await localUser.click(tempNetworkItem)
            expect(chatCommonMock).not.toHaveBeenCalled()

            // advanced past grace period, so network should be fully deleted
            await act(async () => {
                jest.advanceTimersByTime(GRACE_PERIOD_MS)
            })

            // run the expiration check again
            await act(async () => {
                jest.runOnlyPendingTimers()
            })

            // Network should be deleted now
            expect(useTempNetworksStore.getState().tempNetworks.length).toBe(0)

            // ...and removed from the list
            expect(screen.queryByText(displayAgentName)).not.toBeInTheDocument()
        })
    })

    it("Should pass along network icon suggestions to the sidebar", async () => {
        const iconSuggestions = [
            {
                tool: "copy_cat",
                icon_url: "Copy",
            },
            {
                tool: "date_time_provider",
                icon_url: "DateTime",
            },
        ]
        ;(getNetworkIconSuggestions as jest.Mock).mockResolvedValue(iconSuggestions)

        renderMultiAgentAcceleratorPage()

        await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)

        await waitFor(() => expect(networkIconSuggestionsMock).toHaveBeenCalledWith(iconSuggestions))
    })

    it("Should handle getNetworkIconSuggestions failure gracefully", async () => {
        ;(getNetworkIconSuggestions as jest.Mock).mockRejectedValue(new Error("Failed to fetch icon suggestions"))
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()
        renderMultiAgentAcceleratorPage()
        await waitFor(() => {
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("Unable to get network icon suggestions"),
                expect.any(Error)
            )
        })
    })

    it("Should handle receiving something that isn't a ChatMessage", async () => {
        renderMultiAgentAcceleratorPage()
        await act(async () => {
            const result = onChunkReceived("I am not a ChatMessage")
            expect(result).toEqual(true)
        })
    })

    it("should show a popup when onStreamingStarted is called", async () => {
        renderMultiAgentAcceleratorPage()

        const debugSpy = jest.spyOn(console, "debug").mockImplementation()

        await act(async () => {
            onStreamingStarted()
        })

        const expectedPopupText = "Agents working"
        await screen.findByText(expectedPopupText)

        expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining(expectedPopupText))

        // Second time user kicks off an interaction, popup should not appear again
        debugSpy.mockClear()

        // wait for popup to disappear
        await waitFor(() => {
            expect(screen.queryByText(expectedPopupText)).not.toBeInTheDocument()
        })

        await act(async () => {
            onStreamingStarted()
        })

        expect(debugSpy).not.toHaveBeenCalled()

        // make sure popup not in doc
        expect(screen.queryByText(expectedPopupText)).not.toBeInTheDocument()
    })

    it("should show reset conversations onStreamingComplete is called", async () => {
        renderMultiAgentAcceleratorPage()

        await act(async () => {
            onStreamingComplete()
        })

        // Verify conversations were cleared by checking the AgentFlow prop
        await waitFor(() => {
            const lastCall = conversationMock.mock.calls[conversationMock.mock.calls.length - 1]
            expect(lastCall[0]).toBeNull()
        })
    })
})

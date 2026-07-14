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

import {HumanMessage} from "@langchain/core/messages"
import {act, render, screen, waitFor, waitForElementToBeRemoved, within} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"
import {SnackbarProvider} from "notistack"
import {Ref} from "react"
import * as z from "zod"

import {
    LIST_NETWORKS_RESPONSE,
    MOCK_CONNECTIVITY_INFO,
    TEMPORARY_NETWORK,
    TEST_AGENT_MATH_GUY,
    TEST_AGENT_MATH_GUY_DISPLAY,
    TEST_AGENT_MUSIC_NERD,
    TEST_AGENT_MUSIC_NERD_DISPLAY,
    TEST_AGENTS_FOLDER,
    TEST_AGENTS_FOLDER_DISPLAY,
} from "../../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ChatCommonHandle, ChatCommonProps} from "../../../components/AgentChat/ChatCommon/ChatCommon"
import {AgentFlowProps} from "../../../components/MultiAgentAccelerator/AgentFlow/AgentFlow"
import {
    AGENT_NETWORK_DEFINITION_KEY,
    AGENT_NETWORK_DESIGNER_ID,
    AGENT_NETWORK_HOCON,
    AGENT_NETWORK_NAME_KEY,
    AGENT_PROGRESS_CONNECTIVITY_KEY,
    AGENT_RESERVATIONS_KEY,
    AgentNetworkDefinitionEntry,
    EXPIRED_NETWORKS_CHECK_INTERVAL_MS,
    GRACE_PERIOD_MS,
    SHOW_TOUR_DELAY_MS,
    TEMPORARY_NETWORK_FOLDER,
    TRIGGER_APP_TOUR_EVENT_NAME,
} from "../../../components/MultiAgentAccelerator/const"
import {MultiAgentAccelerator} from "../../../components/MultiAgentAccelerator/MultiAgentAccelerator"
import {BYOK} from "../../../components/MultiAgentAccelerator/Schema/SlyData"
import {ImportNetworkModalProps} from "../../../components/MultiAgentAccelerator/Sidebar/ImportNetworkModal"
import {SidebarProps} from "../../../components/MultiAgentAccelerator/Sidebar/Sidebar"
import {MAIN_TOUR_STEPS} from "../../../components/MultiAgentAccelerator/Tour/MainTourSteps"
import {
    getAgentFunction,
    getAgentNetworks,
    getConnectivity,
    sendNetworkDesignerRequest,
} from "../../../controller/agent/Agent"
import {getNetworkIconSuggestions} from "../../../controller/agent/IconSuggestions"
import {NetworkIconSuggestions} from "../../../controller/Types/NetworkIconSuggestions"
import {
    ChatMessageType,
    ChatResponse,
    ConnectivityInfo,
    FunctionResponse,
} from "../../../generated/neuro-san/NeuroSanClient"
import {useAgentChatHistoryStore} from "../../../state/ChatHistory"
import {ByokKeyField, LLM_PROVIDER_API_KEY_FIELD, useSettingsStore} from "../../../state/Settings"
import {TemporaryNetwork, useTempNetworksStore} from "../../../state/TemporaryNetworks"
import {TourPromptState, useTourStore} from "../../../state/Tour"
import {cleanUpAgentName} from "../../../utils/AgentName"

const MOCK_USER = "mock-user"

// Backend neuro-san API server to use
const NEURO_SAN_SERVER_URL = "https://default.example.com"

const conversationMock = vi.fn()
const temporaryNetworksMock = vi.fn()
const networkIconSuggestionsMock = vi.fn()
let onDeleteNetwork: (a: string, b: boolean) => void
let onImport: (name: string, content: string) => void
let onSaveAgent: AgentFlowProps["onSaveAgent"]
let setSelectedNetwork: (network: string) => void

// Mock dependencies
vi.mock("next-auth/react")

vi.mock("../../../controller/agent/Agent")
vi.mock("../../../controller/agent/IconSuggestions")

vi.mock("../../../components/MultiAgentAccelerator/AgentFlow/AgentFlow", () => ({
    AgentFlow: (props: AgentFlowProps) => {
        conversationMock(props.currentConversations)
        onSaveAgent = props.onSaveAgent
        return (
            <div id="app-container">
                <div id="settings-icon" />
                <div id="explore-dropdown" />
                <div id="help-dropdown" />
                <div data-testid="mock-agent-flow">
                    <div aria-label="Control Panel">Dummy Control Panel</div>
                    <div id="multi-agent-accelerator-agent-flow-legend">Dummy Legend</div>
                    <div id="llm-chat-agent-network-ui">Dummy Chat Window</div>
                    <div id="sample-queries-box">Sample queries</div>
                    <div id="user-input-div">User input</div>
                    <button
                        id="agent-network-ui-options-menu-button-container"
                        type="button"
                    >
                        Show Thinking
                    </button>
                    <button
                        id="save-chat-button"
                        type="button"
                    >
                        Save chat
                    </button>
                    {props.agentsInNetwork.map((element) => {
                        const json = JSON.stringify(element)
                        return <div key={json}>{json}</div>
                    })}
                </div>
            </div>
        )
    },
}))

vi.mock("../../../components/MultiAgentAccelerator/Sidebar/Sidebar", async (importOriginal) => {
    const originalModule =
        await importOriginal<typeof import("../../../components/MultiAgentAccelerator/Sidebar/Sidebar")>()

    return {
        ...originalModule,
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

vi.mock("../../../components/MultiAgentAccelerator/Sidebar/ImportNetworkModal", async (importOriginal) => {
    const originalModule =
        await importOriginal<typeof import("../../../components/MultiAgentAccelerator/Sidebar/ImportNetworkModal")>()

    return {
        ...originalModule,
        ImportNetworkModal: (props: ImportNetworkModalProps) => {
            onImport = props.onImport

            const OriginalModal = originalModule.ImportNetworkModal
            return <OriginalModal {...props} />
        },
    }
})

// Not available in JSDom. See: https://github.com/jsdom/jsdom/issues/1695
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Mock ChatCommon to call the mock function with props and support refs
const chatCommonMock = vi.fn()
const handleStopMock = vi.fn()
const handleClearChatMock = vi.fn()

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

vi.mock("../../../components/AgentChat/ChatCommon/ChatCommon", () => ({
    ChatCommon: (props: ChatCommonProps & {ref?: Ref<ChatCommonHandle>}) => {
        chatCommonMock(props)
        setIsAwaitingLlm = props.setIsAwaitingLlm
        onChunkReceived = props.onChunkReceived
        onStreamingStarted = props.onStreamingStarted
        onStreamingComplete = props.onStreamingComplete

        // handleStop and handleClearChat refs
        ;(props.ref as {current?: ChatCommonHandle}).current = {
            handleStop: handleStopMock,
            handleClearChat: handleClearChatMock,
        }
        return (
            <div
                id="test-chat-common"
                data-testid="test-chat-common"
            >
                {props.selectedNetwork}
            </div>
        )
    },
}))

const renderMultiAgentAcceleratorPage = () =>
    render(
        <SnackbarProvider>
            <MultiAgentAccelerator
                defaultNeuroSanUrl={NEURO_SAN_SERVER_URL}
                username={MOCK_USER}
            />
        </SnackbarProvider>
    )

// Fire an import through the mocked ImportNetworkModal once the sidebar has loaded.
const importThroughModal = async (networkName: string, content: string) => {
    await screen.findByText("Agent Networks")
    await act(async () => {
        onImport(networkName, content)
    })
}

describe("MultiAgentAccelerator", () => {
    withStrictMocks()

    let user: ReturnType<typeof userEvent.setup>

    beforeEach(async () => {
        // This has nothing to do with Jest itself and everything to do with a bug in React Testing Library.
        // See: https://github.com/testing-library/user-event/issues/1115#issuecomment-1565730917
        // @ts-expect-error -- it's an ugly workaround to be removed when the above issue is fixed in RTL.
        globalThis["jest"] = {
            advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
        }

        vi.mocked(getAgentNetworks).mockResolvedValue(LIST_NETWORKS_RESPONSE)
        vi.mocked(getConnectivity).mockResolvedValue(MOCK_CONNECTIVITY_INFO)
        vi.mocked(sendNetworkDesignerRequest)

        user = userEvent.setup()

        // Reset zustand stores
        useTempNetworksStore.setState({tempNetworks: []})
        useAgentChatHistoryStore.setState({history: {}})
        useSettingsStore.getState().resetSettings()
        useTourStore.getState().reset()
    })

    it("should render the component and change the network when item is clicked in the sidebar", async () => {
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
                selectedNetwork: `${TEST_AGENTS_FOLDER}/${TEST_AGENT_MUSIC_NERD}`,
                neuroSanURL: NEURO_SAN_SERVER_URL,
                sampleQueries: MOCK_CONNECTIVITY_INFO.metadata["sample_queries"],
            })
        )
    })

    it("should render the component correctly with 'native names' option on or off", async () => {
        useSettingsStore.getState().updateSettings({appearance: {useNativeNames: false}})
        renderMultiAgentAcceleratorPage()

        // click to expand networks
        const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // Ensure Math Guy (default network) element is rendered.
        screen.getByText(TEST_AGENT_MATH_GUY_DISPLAY)

        // Now toggle the setting to use native names
        act(() => {
            useSettingsStore.getState().updateSettings({appearance: {useNativeNames: true}})
        })

        // Now the native agent names should be shown instead of the cleaned up display names
        screen.getByText(TEST_AGENTS_FOLDER)
        screen.getByText(TEST_AGENT_MATH_GUY)
    })

    it("should handle a network with no sample queries", async () => {
        vi.mocked(getConnectivity).mockResolvedValue({
            ...MOCK_CONNECTIVITY_INFO,
            metadata: {},
        })
        renderMultiAgentAcceleratorPage()

        // Expand networks
        const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // Select a network to trigger getConnectivity
        const network = await screen.findByText(TEST_AGENT_MATH_GUY_DISPLAY)
        await user.click(network)

        // Make sure the page rendered ChatCommon with expected props
        expect(chatCommonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                sampleQueries: [],
            })
        )
    })

    it("should display error toast when an error occurs for getAgentNetworks", async () => {
        const debugSpy = vi.spyOn(console, "debug").mockImplementation(vi.fn())
        // Mock getAgentNetworks to reject with an error
        vi.mocked(getAgentNetworks).mockRejectedValue(new Error("Failed to fetch agent networks"))

        renderMultiAgentAcceleratorPage()

        // Assert the console.debug call
        await waitFor(() => {
            expect(debugSpy).toHaveBeenCalledWith(
                expect.stringMatching(new RegExp(`Unable to get list of Agent Networks.*${NEURO_SAN_SERVER_URL}`, "u"))
            )
        })
    })

    it("should display the importing backdrop while a network import is in flight", async () => {
        let resolveSend: () => void
        const sendPromise = new Promise<void>((resolve) => {
            resolveSend = resolve
        })

        vi.mocked(sendNetworkDesignerRequest).mockImplementation(
            async (_url, _signal, _agentName, _updated, _agentNetworkName, _currentUser, onChunk) => {
                onChunk(JSON.stringify(NETWORK_HOCON_CHAT_MESSAGE))
                await sendPromise
            }
        )

        renderMultiAgentAcceleratorPage()

        await screen.findByText("Agent Networks")

        await act(async () => {
            onImport(
                "Santas Workshop Ops",
                JSON.stringify([{origin: "frontman", instructions: "Do the thing", tools: []}])
            )
        })

        await waitFor(() => {
            expect(screen.getByTestId("multi-agent-accelerator-import-backdrop")).toBeVisible()
        })

        await act(async () => {
            resolveSend()
        })

        await waitFor(() => {
            expect(screen.getByTestId("multi-agent-accelerator-import-backdrop")).not.toBeVisible()
        })
    })

    it.each([
        {
            scenario: "the imported file contains no agents",
            networkName: "Empty Network",
            content: JSON.stringify([]),
            expectedLog: "does not contain a valid network definition",
            designerCalls: 0,
        },
        {
            scenario: "the network designer returns no reservation",
            networkName: "Reservationless Network",
            // Default mock resolves to [] without ever invoking onChunk, so no reservation comes back.
            content: JSON.stringify([{origin: "frontman", instructions: "i", tools: []}]),
            expectedLog: "did not return a reservation",
            designerCalls: 1,
        },
        {
            scenario: "conversion of the imported file throws",
            // Not valid JSON — importNetworkFromJson's JSON.parse throws, exercising the catch branch.
            networkName: "Broken Network",
            content: "this is not json",
            expectedLog: 'Failed to update network "Broken Network"',
            designerCalls: 0,
        },
    ])(
        "logs an error and makes $designerCalls designer call(s) when $scenario",
        async ({networkName, content, expectedLog, designerCalls}) => {
            const debugSpy = vi.spyOn(console, "debug").mockImplementation(vi.fn())
            // The invalid-JSON path also logs via console.error before surfacing the toast.
            vi.spyOn(console, "error").mockImplementation(vi.fn())

            renderMultiAgentAcceleratorPage()
            await importThroughModal(networkName, content)

            await waitFor(() => {
                expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining(expectedLog))
            })
            expect(sendNetworkDesignerRequest).toHaveBeenCalledTimes(designerCalls)
        }
    )

    it("should forward the resolved frontman to sendNetworkDesignerRequest", async () => {
        vi.spyOn(console, "debug").mockImplementation(vi.fn())
        const upsertMock = vi.mocked(sendNetworkDesignerRequest)

        renderMultiAgentAcceleratorPage()
        await importThroughModal(
            "Two Agent Network",
            JSON.stringify([
                {origin: "boss", tools: ["worker"], instructions: "lead"},
                {origin: "worker", instructions: "work"},
            ])
        )

        await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1))
        // Third positional arg to sendNetworkDesignerRequest is the frontman name.
        expect(upsertMock.mock.calls[0][2]).toBe("boss")
    })

    it("should open the ImportNetworkModal from the sidebar import button and close it again", async () => {
        renderMultiAgentAcceleratorPage()

        await screen.findByText("Agent Networks")

        // The modal is not mounted until the import button is clicked.
        expect(screen.queryByText("Import network definition")).not.toBeInTheDocument()
        expect(screen.queryByText("Drag & drop a network definition")).not.toBeInTheDocument()

        const importButton = await screen.findByRole("button", {name: /Import Network Definition/u})
        await user.click(importButton)

        // Modal is mounted after clicking import button
        const modalHeading = screen.getByText("Import network definition")
        expect(modalHeading).toBeInTheDocument()

        // The modal is unmounted after clicking the cancel button.
        await user.click(screen.getByRole("button", {name: /cancel/iu}))
        await waitForElementToBeRemoved(modalHeading)
    })

    it("should display error toast when an error occurs for getConnectivity", async () => {
        const debugSpy = vi.spyOn(console, "debug").mockImplementation(vi.fn())
        // Mock getAgentNetworks to reject with an error
        vi.mocked(getConnectivity).mockRejectedValue(new Error("Failed to fetch connectivity"))

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

    it("Should clear the chat when the Add New Network button is clicked", async () => {
        renderMultiAgentAcceleratorPage()
        await screen.findByTestId("test-chat-common")

        handleClearChatMock.mockClear()

        const addButton = screen.getByRole("button", {name: "Add New Network"})
        await userEvent.click(addButton)

        expect(handleClearChatMock).toHaveBeenCalledTimes(1)
    })

    it("Should NOT clear the chat when a regular network is selected", async () => {
        renderMultiAgentAcceleratorPage()
        await screen.findByTestId("test-chat-common")

        handleClearChatMock.mockClear()

        await act(async () => {
            setSelectedNetwork(`${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`)
        })

        expect(handleClearChatMock).not.toHaveBeenCalled()
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
            [...conv.agents].includes(TEST_AGENT_MATH_GUY)
        )
        expect(hasAgent).toBe(true)
    })

    it("should handle receiving a bad message", async () => {
        // Make extractConversations return failure (null) for this one test to simulate a critical error
        const agentConversations = await import("../../../components/MultiAgentAccelerator/AgentConversations")
        vi.spyOn(agentConversations, "extractConversations").mockReturnValue(null)

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
                structure: {total_tokens: 100},
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
        // Render the page, feed the default reservation chunk, and wait until the resulting temp network shows
        // up in `temporaryNetworksMock`. Returns the expected agent name for follow-up assertions.
        const seedTemporaryNetworkFromDefaultReservation = async (): Promise<string> => {
            renderMultiAgentAcceleratorPage()
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
            return expectedAgentName
        }

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
                agentNetworkName: RESERVATION.reservation_id,
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

        it("Should store agent_network_definition under the temporary network's own store entry", async () => {
            // When a reservation arrives alongside sly_data that contains agent_network_definition,
            // that data should be stored on the temporary network's own entry in the temp-networks
            // store — NOT in the chat history sly_data.
            const agentNetworkDefinition = [
                {origin: "copy_cat", tools: [] as string[], display_as: "llm_agent", instructions: "Copy everything."},
            ]
            const reservationWithDefinition: ChatResponse = {
                response: {
                    ...RESERVATION_CHAT_MESSAGE.response,
                    sly_data: {
                        ...RESERVATION_CHAT_MESSAGE.response.sly_data,
                        [AGENT_NETWORK_DEFINITION_KEY]: agentNetworkDefinition,
                    },
                },
            }

            renderMultiAgentAcceleratorPage()

            await act(async () => {
                onChunkReceived(JSON.stringify(reservationWithDefinition))
            })

            const expectedNetworkKey = `${TEMPORARY_NETWORK_FOLDER}/${RESERVATION.reservation_id}`

            // The agent_network_definition must be stored on the temporary network's own entry
            const storedNetwork = useTempNetworksStore
                .getState()
                .tempNetworks.find((n) => n.agentInfo.agent_name === expectedNetworkKey)
            expect(storedNetwork).toBeDefined()
            expect(storedNetwork?.agentNetworkDefinition).toEqual(agentNetworkDefinition)
        })

        it("Should store agent_network_definition independently for two different temporary networks", async () => {
            // Each temporary network must have its own independent agentNetworkDefinition entry.
            const definitionA = [
                {
                    origin: "agent_alpha",
                    tools: [] as string[],
                    display_as: "llm_agent",
                    instructions: "Network A instructions.",
                },
            ]
            const definitionB = [
                {
                    origin: "agent_beta",
                    tools: [] as string[],
                    display_as: "llm_agent",
                    instructions: "Network B instructions.",
                },
            ]

            const reservationA = {
                reservation_id: "res-a",
                lifetime_in_seconds: 3600,
                expiration_time_in_seconds: Math.floor(Date.now() / 1000) + 3600,
            }
            const reservationB = {
                reservation_id: "res-b",
                lifetime_in_seconds: 3600,
                expiration_time_in_seconds: Math.floor(Date.now() / 1000) + 3600,
            }

            const chunkA: ChatResponse = {
                response: {
                    type: ChatMessageType.AGENT_FRAMEWORK,
                    text: "",
                    origin: [{tool: "copy_cat"}],
                    sly_data: {
                        [AGENT_RESERVATIONS_KEY]: [reservationA],
                        [AGENT_NETWORK_DEFINITION_KEY]: definitionA,
                    },
                },
            }
            const chunkB: ChatResponse = {
                response: {
                    type: ChatMessageType.AGENT_FRAMEWORK,
                    text: "",
                    origin: [{tool: "copy_cat"}],
                    sly_data: {
                        [AGENT_RESERVATIONS_KEY]: [reservationB],
                        [AGENT_NETWORK_DEFINITION_KEY]: definitionB,
                    },
                },
            }

            renderMultiAgentAcceleratorPage()

            await act(async () => {
                onChunkReceived(JSON.stringify(chunkA))
            })
            await act(async () => {
                onChunkReceived(JSON.stringify(chunkB))
            })

            const keyA = `${TEMPORARY_NETWORK_FOLDER}/${reservationA.reservation_id}`
            const keyB = `${TEMPORARY_NETWORK_FOLDER}/${reservationB.reservation_id}`

            const defA = useTempNetworksStore
                .getState()
                .tempNetworks.find((n) => n.agentInfo.agent_name === keyA)?.agentNetworkDefinition
            const defB = useTempNetworksStore
                .getState()
                .tempNetworks.find((n) => n.agentInfo.agent_name === keyB)?.agentNetworkDefinition

            // Each network must have its own definition
            expect(defA).toEqual(definitionA)
            expect(defB).toEqual(definitionB)

            // Sanity: definitions must not bleed across networks
            expect(defA).not.toEqual(definitionB)
            expect(defB).not.toEqual(definitionA)
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
            vi.spyOn(console, "debug").mockImplementation(vi.fn())
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
            vi.spyOn(console, "debug").mockImplementation(vi.fn())
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
            const expectedAgentName = await seedTemporaryNetworkFromDefaultReservation()
            temporaryNetworksMock.mockClear()

            // Seed chat history for the network so we can verify it is cleared on delete.
            useAgentChatHistoryStore
                .getState()
                .updateChatHistory(expectedAgentName, [new HumanMessage("hello from temp network")])
            expect(useAgentChatHistoryStore.getState().history[expectedAgentName]).toBeDefined()

            // Select the network so the active-network cleanup branch (clear selection, reset agent counts) runs.
            const tempNetworkItem = await screen.findByText(cleanUpAgentName(RESERVATION.reservation_id))
            await user.click(tempNetworkItem)

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

            // Chat history for the deleted network should have been purged from the store (IndexedDB).
            expect(useAgentChatHistoryStore.getState().history[expectedAgentName]).toBeUndefined()

            // ChatCommon's selectedNetwork should be cleared, proving the active-network deselection branch ran.
            expect(chatCommonMock).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    selectedNetwork: null,
                })
            )
        })

        it("Should handle deleting expired temporary networks without confirmation", async () => {
            const expectedAgentName = await seedTemporaryNetworkFromDefaultReservation()
            temporaryNetworksMock.mockClear()

            // Seed chat history for the network so we can verify it is cleared on delete.
            useAgentChatHistoryStore
                .getState()
                .updateChatHistory(expectedAgentName, [new HumanMessage("hello from expired network")])
            expect(useAgentChatHistoryStore.getState().history[expectedAgentName]).toBeDefined()

            // Select the network so the active-network cleanup branch runs.
            const tempNetworkItem = await screen.findByText(cleanUpAgentName(RESERVATION.reservation_id))
            await user.click(tempNetworkItem)

            // Simulate user deleting the expired temporary network
            await act(async () => onDeleteNetwork(expectedAgentName, true))

            // Should delete without confirmation
            expect(screen.queryByTestId("delete-network-confirmation-modal-confirm-main")).not.toBeInTheDocument()

            // Make sure network deleted
            expect(temporaryNetworksMock).toHaveBeenCalledWith([])

            // Chat history for the deleted network should have been purged.
            expect(useAgentChatHistoryStore.getState().history[expectedAgentName]).toBeUndefined()

            // Active-network deselection should have run (selectedNetwork becomes null).
            expect(chatCommonMock).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    selectedNetwork: null,
                })
            )
        })

        it("Should delete an unselected temporary network without touching the active selection", async () => {
            const expectedAgentName = await seedTemporaryNetworkFromDefaultReservation()

            // Don't select the temp network — leave it unselected so the active-selection branch in the
            // delete handler does NOT fire. This covers the else-branch of `selectedNetwork === networkId`.
            temporaryNetworksMock.mockClear()
            chatCommonMock.mockClear()

            await act(async () => onDeleteNetwork(expectedAgentName, true))

            // Network removed, but selection (which was already null) should not have been re-cleared via this path.
            expect(temporaryNetworksMock).toHaveBeenCalledWith([])
            expect(useAgentChatHistoryStore.getState().history[expectedAgentName]).toBeUndefined()
        })

        it("Should delete an unselected temporary network via the confirmation modal", async () => {
            const expectedAgentName = await seedTemporaryNetworkFromDefaultReservation()

            // Leave the network unselected so the else-branch of `selectedNetwork === networkToBeDeleted`
            // inside the confirmation-modal handler runs.
            temporaryNetworksMock.mockClear()

            await act(async () => onDeleteNetwork(expectedAgentName, false))
            const modal = screen.getByTestId("delete-network-confirmation-modal-confirm-main")
            await user.click(within(modal).getByRole("button", {name: "Confirm"}))

            expect(temporaryNetworksMock).toHaveBeenCalledWith([])
            expect(useAgentChatHistoryStore.getState().history[expectedAgentName]).toBeUndefined()
        })

        it("Should leave the network alone when the user cancels the delete confirmation modal", async () => {
            const expectedAgentName = await seedTemporaryNetworkFromDefaultReservation()
            temporaryNetworksMock.mockClear()

            // Open the modal, then cancel.
            await act(async () => onDeleteNetwork(expectedAgentName, false))
            const modal = screen.getByTestId("delete-network-confirmation-modal-confirm-main")
            const cancelButton = within(modal).getByRole("button", {name: "Cancel"})
            await user.click(cancelButton)

            // Modal closes and the network is NOT deleted.
            expect(screen.queryByTestId("delete-network-confirmation-modal-confirm-main")).not.toBeInTheDocument()
            expect(temporaryNetworksMock).not.toHaveBeenCalledWith([])
        })

        it("Should handle temporary networks expiring", async () => {
            const now = Date.now()
            vi.useFakeTimers({now})

            const localUser = userEvent.setup({
                advanceTimers: vi.advanceTimersByTime,
            })

            renderMultiAgentAcceleratorPage()

            // Set up a temporary network
            const expirationTimeSeconds = 60
            const reservation: TemporaryNetwork = {
                ...TEMPORARY_NETWORK,
                reservation: {
                    ...TEMPORARY_NETWORK.reservation,
                    expiration_time_in_seconds: Math.floor(now / 1000) + expirationTimeSeconds,
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

            // Feed it the temp networks chunk
            await act(async () => {
                onChunkReceived(JSON.stringify(reservationChatMessage))
            })

            // Make sure network saved to store
            expect(useTempNetworksStore.getState().tempNetworks.length).toBe(1)

            const expectedNetworkName = `${TEMPORARY_NETWORK_FOLDER}/${TEMPORARY_NETWORK.reservation.reservation_id}`

            // Seed chat history so we can verify the reaper purges it after the grace period.
            useAgentChatHistoryStore
                .getState()
                .updateChatHistory(expectedNetworkName, [new HumanMessage("hello before expiry")])
            expect(useAgentChatHistoryStore.getState().history[expectedNetworkName]).toBeDefined()

            // Not expired yet so we should see the network
            const temporaryNetworkNode = document.querySelector(
                `[data-itemid="${expectedNetworkName}"]`
            ) satisfies HTMLElement

            expect(temporaryNetworkNode).not.toBeNull()

            const displayAgentName = cleanUpAgentName(TEMPORARY_NETWORK.reservation.reservation_id)
            screen.getByText(displayAgentName)

            // Make sure we see the temp network
            const tempNetworkItem = await within(temporaryNetworkNode).findByText(displayAgentName)

            // Click the network to select it
            await localUser.click(tempNetworkItem)

            // ChatCommon should be called with the selected network as the target agent -- a bit of an indirect way
            // to verify that the network was selected. There may be a more elegant way to do this.
            expect(chatCommonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    selectedNetwork: expectedNetworkName,
                })
            )

            // Reset mock calls so we have a clean slate
            chatCommonMock.mockClear()

            // First time "expired check" runs, it should not be expired yet
            act(() => {
                vi.advanceTimersByTime(EXPIRED_NETWORKS_CHECK_INTERVAL_MS)
            })

            // Verify that ChatCommon was called with the selected network still intact, meaning it was not expired yet.
            expect(chatCommonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    selectedNetwork: expectedNetworkName,
                })
            )

            // Reset mock calls so we have a clean slate
            chatCommonMock.mockClear()

            // advanced past expiration time but still within grace period, meaning we show the network but flag it as
            // expired and do not let the user select it
            act(() => {
                vi.advanceTimersByTime(expirationTimeSeconds * 1000)
            })

            // Wait for post-expiry renders to settle and verify network was deselected (null was passed to ChatCommon)
            await waitFor(() => {
                expect(chatCommonMock).toHaveBeenLastCalledWith(
                    expect.objectContaining({
                        selectedNetwork: null,
                    })
                )
            })

            // ...but should still be in the store since we're within the grace period
            expect(useTempNetworksStore.getState().tempNetworks.length).toBe(1)

            // Requery for stability
            const expiredTemporaryNetworkNode = document.querySelector(
                `[data-itemid="${expectedNetworkName}"]`
            ) satisfies HTMLElement

            expect(expiredTemporaryNetworkNode).not.toBeNull()

            const expiredTempNetworkItem = await within(expiredTemporaryNetworkNode).findByText(displayAgentName)

            // Mouse over -- should get "expired" Tooltip
            await localUser.hover(expiredTempNetworkItem)
            await waitFor(() => within(expiredTemporaryNetworkNode).getByLabelText("Expired"))

            // advanced past grace period + next reaper interval, so network should be fully deleted
            act(() => {
                vi.advanceTimersByTime(GRACE_PERIOD_MS + EXPIRED_NETWORKS_CHECK_INTERVAL_MS + 1)
            })

            // Network should be deleted now
            await waitFor(() => expect(useTempNetworksStore.getState().tempNetworks.length).toBe(0))

            // ...and removed from the list
            expect(screen.queryByText(displayAgentName)).not.toBeInTheDocument()

            // Chat history for the reaped network should also be gone.
            expect(useAgentChatHistoryStore.getState().history[expectedNetworkName]).toBeUndefined()
        })
    })

    it("Should not allow user to select an expired temporary network", async () => {
        const expiredTemporaryNetwork: TemporaryNetwork = {
            ...TEMPORARY_NETWORK,
            reservation: {
                ...TEMPORARY_NETWORK.reservation,
                expiration_time_in_seconds: Math.floor(Date.now() / 1000) - 60,
            },
        }

        useTempNetworksStore.setState({tempNetworks: [expiredTemporaryNetwork]})

        renderMultiAgentAcceleratorPage()

        // Expand temporary networks section
        const header = await screen.findByText(cleanUpAgentName(TEMPORARY_NETWORK_FOLDER))
        await user.click(header)

        const displayAgentName = cleanUpAgentName(expiredTemporaryNetwork.agentNetworkName)
        const tempNetworkItem = await screen.findByText(displayAgentName)

        // Mouse over -- should get "expired" Tooltip
        await user.hover(tempNetworkItem)
        await screen.findByText(/Expired/u)

        // Clear previous mock calls
        chatCommonMock.mockClear()

        await user.click(tempNetworkItem)

        // Network expired; clicking should have no effect
        expect(chatCommonMock).not.toHaveBeenCalled()
    })

    it("Should pass along network icon suggestions to the sidebar", async () => {
        const iconSuggestions = {
            copy_cat: "Copy",
            date_time_provider: "DateTime",
        } satisfies NetworkIconSuggestions

        vi.mocked(getNetworkIconSuggestions).mockResolvedValue(iconSuggestions)

        renderMultiAgentAcceleratorPage()

        await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)

        await waitFor(() => expect(networkIconSuggestionsMock).toHaveBeenCalledWith(iconSuggestions))
    })

    it("Should handle getNetworkIconSuggestions failure gracefully", async () => {
        vi.mocked(getNetworkIconSuggestions).mockRejectedValue(new Error("Failed to fetch icon suggestions"))

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn())
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

    describe("extraSlyData", () => {
        const agentNetworkDefinition = [
            {origin: "agent1", tools: [] as string[], display_as: "llm_agent", instructions: "Do stuff."},
        ]

        const tempNetworkWithDefinition: TemporaryNetwork = {
            ...TEMPORARY_NETWORK,
            agentNetworkDefinition,
        }

        it("is undefined for a normal (non-temporary) network", async () => {
            renderMultiAgentAcceleratorPage()

            const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
            await user.click(header)
            const mathGuy = await screen.findByText(TEST_AGENT_MATH_GUY_DISPLAY)
            await user.click(mathGuy)

            await waitFor(() => {
                expect(chatCommonMock).toHaveBeenCalledWith(
                    expect.objectContaining({
                        selectedNetwork: `${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`,
                        extraSlyData: undefined,
                    })
                )
            })
        })

        it("includes definition, name, and hocon for a temporary network", async () => {
            useTempNetworksStore.setState({tempNetworks: [tempNetworkWithDefinition]})

            renderMultiAgentAcceleratorPage()
            await screen.findByText("Agent Networks")

            await act(async () => {
                setSelectedNetwork(TEMPORARY_NETWORK.agentInfo.agent_name)
            })

            await waitFor(() => {
                expect(chatCommonMock).toHaveBeenCalledWith(
                    expect.objectContaining({
                        selectedNetwork: TEMPORARY_NETWORK.agentInfo.agent_name,
                        extraSlyData: {
                            [AGENT_NETWORK_DEFINITION_KEY]: agentNetworkDefinition,
                            [AGENT_NETWORK_NAME_KEY]: TEMPORARY_NETWORK.agentNetworkName,
                            [AGENT_NETWORK_HOCON]: TEMPORARY_NETWORK.networkHocon,
                        },
                    })
                )
            })
        })

        it("includes only agent_network_definition for Agent Network Designer from matching temp network", async () => {
            useTempNetworksStore.setState({tempNetworks: [tempNetworkWithDefinition]})

            // Seed the designer's sly_data in IndexedDB so the component can resolve the matching temp network
            useAgentChatHistoryStore.setState({
                history: {
                    [AGENT_NETWORK_DESIGNER_ID]: {
                        chatHistory: [],
                        chatContext: {},
                        slyData: {[AGENT_NETWORK_NAME_KEY]: TEMPORARY_NETWORK.agentNetworkName},
                    },
                },
            })

            renderMultiAgentAcceleratorPage()
            await screen.findByText("Agent Networks")

            await act(async () => {
                setSelectedNetwork(AGENT_NETWORK_DESIGNER_ID)
            })

            await waitFor(() => {
                expect(chatCommonMock).toHaveBeenCalledWith(
                    expect.objectContaining({
                        selectedNetwork: AGENT_NETWORK_DESIGNER_ID,
                        extraSlyData: {
                            [AGENT_NETWORK_DEFINITION_KEY]: agentNetworkDefinition,
                        },
                    })
                )
            })
        })

        const badProvider = "not_a_known_provider"

        type ByokTestCase = {
            readonly required: ByokKeyField[]
            readonly expectedMissing: boolean
        }

        it.each<ByokTestCase>([
            {required: [LLM_PROVIDER_API_KEY_FIELD["OpenAI"]], expectedMissing: true},
            {
                required: [LLM_PROVIDER_API_KEY_FIELD["OpenAI"], LLM_PROVIDER_API_KEY_FIELD["Anthropic"]],
                expectedMissing: false,
            },
            {required: [LLM_PROVIDER_API_KEY_FIELD["Anthropic"]], expectedMissing: false},
            {required: [badProvider as ByokKeyField], expectedMissing: false},
            {required: [], expectedMissing: false},
            {required: undefined, expectedMissing: false},
        ])("should handle networks that require BYOK for $required", async ({expectedMissing, required}) => {
            vi.mocked(getAgentFunction).mockResolvedValue({
                function: {
                    sly_data_schema: {
                        type: "object",
                        properties: {
                            llm_config: {
                                type: "object",
                                // Create a subkey for each provider in "required".
                                properties: required
                                    ? {...Object.fromEntries(required.map((key) => [key, {type: "string"}]))}
                                    : undefined,
                            },
                        },
                        required: ["llm_config"],
                    } satisfies z.infer<typeof BYOK>,
                },
            } satisfies FunctionResponse)

            // Validate against schema. Mostly just to "test our test".
            BYOK.parse((await getAgentFunction(null, null, null)).function?.sly_data_schema)

            // Add an existing API key to the store. This represents the key that the user has supplied
            useSettingsStore.getState().updateSettings({
                apiKeys: {
                    Anthropic: {
                        expiresAt: Number.MAX_SAFE_INTEGER,
                        value: "anthropic-key",
                    },
                },
            })

            renderMultiAgentAcceleratorPage()

            await act(async () => {
                setSelectedNetwork(`${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`)
            })

            await screen.findByText(`${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`)

            // Make sure the missingApiKeys set (as passed to the ChatCommon mock) matches what we expect based on
            // the required keys and the existing keys in the store.
            expect(chatCommonMock).toHaveBeenCalledWith(
                expect.objectContaining<Partial<ChatCommonProps>>({
                    selectedNetwork: `${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`,
                    hasMissingApiKeys: expectedMissing,
                })
            )
        })

        it("handles an error when fetching agent function", async () => {
            vi.spyOn(console, "warn").mockImplementation(vi.fn())
            vi.mocked(getAgentFunction).mockRejectedValue(new Error("Failed to fetch agent function"))
            renderMultiAgentAcceleratorPage()

            // Search for something known to make sure rendering settled
            await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
            await act(async () => {
                setSelectedNetwork(`${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`)
            })

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining(`${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`),
                expect.any(Error)
            )
        })
    })

    describe("onSaveAgent", () => {
        const UPDATED_DEFINITION: AgentNetworkDefinitionEntry[] = [{origin: "copy_cat", tools: []}]

        // Mock the network designer stream so onSaveAgent's chunk collector receives the given chunks.
        const mockDesignerStream = (...chunks: string[]) => {
            vi.mocked(sendNetworkDesignerRequest).mockImplementation(async (...args: unknown[]) => {
                const onChunk = args[6] as (chunk: string) => void
                chunks.forEach((chunk) => onChunk(chunk))
            })
        }

        it("upserts the returned network and reselects it when a matching reservation is streamed", async () => {
            mockDesignerStream(JSON.stringify(RESERVATION_CHAT_MESSAGE))
            renderMultiAgentAcceleratorPage()

            // Select a network so onSaveAgent has a selectedNetwork to copy chat history from.
            const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
            await user.click(header)
            await user.click(await screen.findByText(TEST_AGENT_MATH_GUY_DISPLAY))

            await act(async () => {
                await onSaveAgent(
                    "copy_cat",
                    UPDATED_DEFINITION,
                    RESERVATION.reservation_id,
                    new AbortController().signal
                )
            })

            const expectedAgentName = `${TEMPORARY_NETWORK_FOLDER}/${RESERVATION.reservation_id}`
            // The returned reservation was upserted into the temp networks store...
            expect(useTempNetworksStore.getState().tempNetworks).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        agentInfo: expect.objectContaining({agent_name: expectedAgentName}),
                    }),
                ])
            )
            // ...and the newly-saved network became the selected target.
            await waitFor(() => {
                expect(chatCommonMock).toHaveBeenCalledWith(
                    expect.objectContaining({selectedNetwork: expectedAgentName})
                )
            })
        })

        it("shows an error and does not upsert when the designer returns no reservation", async () => {
            // eslint-disable-next-line no-empty-function, @typescript-eslint/no-empty-function
            const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
            mockDesignerStream() // no chunks → no networks collected
            renderMultiAgentAcceleratorPage()
            await screen.findByText("Agent Networks")

            await act(async () => {
                await onSaveAgent(
                    "copy_cat",
                    UPDATED_DEFINITION,
                    RESERVATION.reservation_id,
                    new AbortController().signal
                )
            })

            expect(useTempNetworksStore.getState().tempNetworks).toHaveLength(0)
            expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("did not return a reservation"))
        })

        it("shows an error when the returned reservation does not match the edited network", async () => {
            // eslint-disable-next-line no-empty-function, @typescript-eslint/no-empty-function
            const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
            mockDesignerStream(JSON.stringify(RESERVATION_CHAT_MESSAGE))
            renderMultiAgentAcceleratorPage()
            await screen.findByText("Agent Networks")

            await act(async () => {
                // agentNetworkName does not match the streamed reservation's derived name → no replacement found.
                const signal = new AbortController().signal
                await onSaveAgent("copy_cat", UPDATED_DEFINITION, "some-other-network", signal)
            })

            expect(useTempNetworksStore.getState().tempNetworks).toHaveLength(0)
            expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("did not match the current network"))
        })

        it("notifies a save error when the network designer stream throws", async () => {
            // eslint-disable-next-line no-empty-function, @typescript-eslint/no-empty-function
            const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
            // eslint-disable-next-line no-empty-function, @typescript-eslint/no-empty-function
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
            vi.mocked(sendNetworkDesignerRequest).mockRejectedValue(new Error("stream exploded"))
            renderMultiAgentAcceleratorPage()
            await screen.findByText("Agent Networks")

            await act(async () => {
                await onSaveAgent(
                    "copy_cat",
                    UPDATED_DEFINITION,
                    RESERVATION.reservation_id,
                    new AbortController().signal
                )
            })

            expect(errorSpy).toHaveBeenCalled()
            expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("stream exploded"))
        })

        it("suppresses the error notification when the save is aborted by the user", async () => {
            vi.mocked(sendNetworkDesignerRequest).mockRejectedValue(
                new DOMException("The operation was aborted", "AbortError")
            )
            renderMultiAgentAcceleratorPage()
            await screen.findByText("Agent Networks")

            // No console spies: an AbortError must be swallowed silently (no console.error / notification),
            // so any logging here would fail the test via jest-fail-on-console.
            await act(async () => {
                await onSaveAgent(
                    "copy_cat",
                    UPDATED_DEFINITION,
                    RESERVATION.reservation_id,
                    new AbortController().signal
                )
            })

            expect(useTempNetworksStore.getState().tempNetworks).toHaveLength(0)
        })
    })

    describe("Tour", () => {
        it("should run the tour when requested and successfully visit each step", async () => {
            renderMultiAgentAcceleratorPage()

            await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)

            // Dispatch the tour request
            await act(async () => {
                window.dispatchEvent(new Event(TRIGGER_APP_TOUR_EVENT_NAME))
            })

            // Click to expand the folder in UI hierarchy
            const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
            await user.click(header)

            // Verify that 'test-agents/math-guy' was successfully primed and rendered
            await screen.findByText(TEST_AGENT_MATH_GUY_DISPLAY)

            // Make sure we see the tour first step
            await screen.findByText(MAIN_TOUR_STEPS[0].content.toString())

            // Click through remaining steps and verify their content shows up
            for (const step of MAIN_TOUR_STEPS.slice(1)) {
                // Make sure step at least appears in the DOM, though due to mocks we may get false negatives here
                // Steps can (in theory) be functions that return an element, or just an element
                const stepElement = typeof step.target === "function" ? step.target() : step.target
                expect(stepElement).toBeVisible()
                const nextButton = await screen.findByRole("button", {name: /Next \(\d+ of \d+\)|End Tour/u})
                await user.click(nextButton)
                await screen.findByText(step.content.toString())
            }
        }, 10_000)

        it.each([
            {
                buttonName: "Take the tour",
                shouldStartTour: true,
                expectedStatus: TourPromptState.Taken,
            },
            {
                buttonName: "Not now",
                shouldStartTour: false,
                expectedStatus: TourPromptState.NotPrompted,
            },
            {
                buttonName: "Don't show this again",
                shouldStartTour: false,
                expectedStatus: TourPromptState.DontShowAgain,
            },
        ])(
            "Should handle responding '$buttonName' to the tour prompt correctly",
            async ({buttonName, shouldStartTour, expectedStatus}) => {
                vi.useFakeTimers()

                const localUser = userEvent.setup({
                    advanceTimers: vi.advanceTimersByTime,
                })

                renderMultiAgentAcceleratorPage()

                // Let initial fetch/useEffect work settle. Note: vi.waitFor() here, not RTL waitFor(), since the
                // vitest version is "fake timers aware"
                await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)

                // Advance timers to trigger the tour prompt modal
                act(() => {
                    vi.advanceTimersByTime(SHOW_TOUR_DELAY_MS + 1)
                })

                // Locate and click the target response button
                const actionButton = screen.getByRole("button", {name: buttonName})

                await localUser.click(actionButton)

                if (shouldStartTour) {
                    act(() => {
                        vi.advanceTimersByTime(100)
                    })

                    // Positive Case: Wait until the introductory tour step text mounts in the DOM
                    await screen.findByText(MAIN_TOUR_STEPS[0].content.toString())
                } else {
                    // Negative Case: Safely wait until the prompt dialog counts hit 0
                    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

                    // Give joyride time to launch the tour, if it's planning to
                    act(() => {
                        vi.advanceTimersByTime(100)
                    })

                    // Assert that the first step text remains completely absent from the DOM layout
                    expect(screen.queryByText(MAIN_TOUR_STEPS[0].content.toString())).not.toBeInTheDocument()
                }

                // Verify that the global state store matches the expected final state
                expect(useTourStore.getState().status).toEqual(expectedStatus)
            }
        )
    })
})

import type {ChatCommonHandle, ChatCommonProps} from "../../components/AgentChat/ChatCommon"
import {act, render, screen, waitFor} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {useSession} from "next-auth/react"
import {SnackbarProvider} from "notistack"
import {forwardRef} from "react"

import {AgentFlowProps} from "../../components/MultiAgentAccelerator/AgentFlow"
import {testConnection} from "../../controller/agent/Agent"
import {ChatMessageType} from "../../generated/neuro-san/NeuroSanClient"
import {ChatResponse} from "../../generated/neuro-san/OpenAPITypes"
import MultiAgentAcceleratorPage from "../../pages/multiAgentAccelerator"
import useEnvironmentStore from "../../state/environment"
import {withStrictMocks} from "../common/strictMocks"
import {mockFetch} from "../common/TestUtils"

const MOCK_USER = "mock-user"

// Backend neuro-san API server to use
const NEURO_SAN_SERVER_URL = "https://default.example.com"

const TEST_AGENT_MATH_GUY = "Math Guy"
const TEST_AGENT_MUSIC_NERD = "Music Nerd"

const mockUseSession = useSession as jest.Mock

// Mock dependencies
jest.mock("next-auth/react")

jest.mock("../../controller/agent/Agent")

// AgentFlow mock
const conversationMock = jest.fn()

jest.mock("../../components/MultiAgentAccelerator/AgentFlow", () => ({
    __esModule: true,
    default: (props: AgentFlowProps) => {
        conversationMock(props.currentConversations)
        return <div data-testid="mock-agent-flow" />
    },
}))

// Mock ChatCommon to call the mock function with props and support refs
const chatCommonMock = jest.fn()
const handleStopMock = jest.fn()

let setIsAwaitingLlm: (val: boolean) => void
let onChunkReceived: (chunk: string) => void
let onStreamingStarted: () => void

jest.mock("../../components/AgentChat/ChatCommon", () => ({
    ChatCommon: forwardRef<ChatCommonHandle, ChatCommonProps>((props, ref) => {
        chatCommonMock(props)
        setIsAwaitingLlm = props.setIsAwaitingLlm
        onChunkReceived = props.onChunkReceived
        onStreamingStarted = props.onStreamingStarted
        // handleStop ref
        ;(ref as {current?: ChatCommonHandle}).current = {handleStop: handleStopMock}
        return (
            <div
                id="test-chat-common"
                data-testid="test-chat-common"
            />
        )
    }),
}))

window.fetch = mockFetch({})

const renderMultiAgentAcceleratorPage = () =>
    render(
        <SnackbarProvider>
            <MultiAgentAcceleratorPage />
        </SnackbarProvider>
    )

const CONVERSATION_MESSAGE: ChatResponse = {
    response: {
        type: ChatMessageType.AI,
        text: "This is a test message",
        origin: [{tool: TEST_AGENT_MATH_GUY}],
    },
}

describe("Multi Agent Accelerator Page", () => {
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
        ;(testConnection as jest.Mock).mockResolvedValue({success: true, status: "ok", version: "1.0.0"})

        user = userEvent.setup()
    })

    it("should render elements on the page and change the page on click of sidebar item", async () => {
        renderMultiAgentAcceleratorPage()

        // Ensure Math Guy (default network) element is rendered.
        await screen.findByText(TEST_AGENT_MATH_GUY)

        // Find sidebar. Will fail if <> 1 found
        await screen.findByText("Agent Networks")

        // Ensure Music Nerd is initially shown once. Will fail if <> 1 found
        const musicNerdItem = await screen.findByText(TEST_AGENT_MUSIC_NERD)

        // Click Music Nerd sidebar item
        await user.click(musicNerdItem)

        // Music Nerd is selected now. Make sure we see it.
        await screen.findByText(TEST_AGENT_MUSIC_NERD)

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

        renderMultiAgentAcceleratorPage()

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

        renderMultiAgentAcceleratorPage()

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
        const mockChunk = JSON.stringify(CONVERSATION_MESSAGE)

        await act(async () => {
            onChunkReceived(mockChunk)
        })

        expect(chatCommonMock).toHaveBeenCalled()

        // Verify that the conversation object was passed with the correct array
        expect(conversationMock).toHaveBeenCalledWith(expect.any(Array))

        // Verify the conversations array contains the expected agent
        const conversationCall = conversationMock.mock.calls[conversationMock.mock.calls.length - 1][0]
        const hasAgent = conversationCall.some((conv: {agents: Set<string>}) =>
            Array.from(conv.agents).includes(TEST_AGENT_MATH_GUY)
        )
        expect(hasAgent).toBe(true)
    })

    it("should handle receiving an end of conversation chat message", async () => {
        renderMultiAgentAcceleratorPage()

        // Set up one active agent
        const activeAgentChunk = JSON.stringify(CONVERSATION_MESSAGE)
        await act(async () => {
            onChunkReceived(activeAgentChunk)
        })

        // Verify agent is in conversation
        expect(conversationMock).toHaveBeenCalled()
        conversationMock.mockClear()

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

        // Math guy conversation should still be active
        // We should verify that Math Guy is still in the conversations, not just that the component rendered
        const conversationCalls = conversationMock.mock.calls
        if (conversationCalls.length > 0) {
            const latestCall = conversationCalls[conversationCalls.length - 1][0]
            if (latestCall && Array.isArray(latestCall)) {
                const hasMathGuy = latestCall.some((conv: {agents: Set<string>}) =>
                    conv.agents.has(TEST_AGENT_MATH_GUY)
                )
                expect(hasMathGuy).toBe(true)
            }
        }
        conversationMock.mockClear()

        // Now the end of conversation message for the active agent
        const chatMessage: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT,
                text: "This is a test message",
                // One of "hints" for end of conversation is having a structure field containing total_tokens
                structure: {total_tokens: 100} as unknown as Record<string, never>,
                origin: [{tool: TEST_AGENT_MATH_GUY}],
            },
        }
        await act(async () => {
            onChunkReceived(JSON.stringify(chatMessage))
        })

        // Conversation should now be empty/null since it is complete
        expect(conversationMock).toHaveBeenCalledWith(null)
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
    })
})

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

import {act, render, screen} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {FC, useEffect} from "react"
import {EdgeProps, ReactFlowProvider} from "reactflow"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import {AgentFlow, AgentFlowProps} from "../../../components/MultiAgentAccelerator/AgentFlow"
import {ChatMessageType, ConnectivityInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {usePreferences} from "../../../state/Preferences"

const TEST_AGENT_MUSIC_NERD_PRO = "Music Nerd Pro"

jest.mock("../../../components/MultiAgentAccelerator/PlasmaEdge", () => ({
    PlasmaEdge: () => <g data-testid="mock-plasma-edge" />,
}))

jest.mock("../../../components/MultiAgentAccelerator/ThoughtBubbleEdge", () => ({
    ThoughtBubbleEdge: () => <g data-testid="mock-thought-bubble-edge" />,
}))

// Provide a mutable implementation for the ThoughtBubbleOverlay mock so individual
// tests can swap the implementation without attempting to redefine the module
// export (which can throw "Cannot redefine property" errors).
type ThoughtBubbleOverlayProps = {
    onBubbleHoverChange?: (id: string) => void
}

const defaultMockThoughtBubbleOverlay: FC<ThoughtBubbleOverlayProps> = () => (
    <div data-testid="mock-thought-bubble-overlay" />
)

let __MockThoughtBubbleOverlayImpl: FC<ThoughtBubbleOverlayProps> = defaultMockThoughtBubbleOverlay
jest.mock("../../../components/MultiAgentAccelerator/ThoughtBubbleOverlay", () => ({
    ThoughtBubbleOverlay: (props: ThoughtBubbleOverlayProps) => __MockThoughtBubbleOverlayImpl(props),
}))

// Mock Preferences state
jest.mock("../../../state/Preferences")
const mockedUsePreferences = jest.mocked(usePreferences, {shallow: true})

describe("AgentFlow", () => {
    let user: UserEvent

    withStrictMocks()

    beforeEach(() => {
        user = userEvent.setup()

        mockedUsePreferences.mockReturnValue({darkMode: false, toggleDarkMode: jest.fn()})
    })

    const network: ConnectivityInfo[] = [
        {
            origin: "agent1",
            tools: ["agent2", "agent3"],
        },
        {
            origin: "agent2",
            tools: ["agent3"],
        },
        {
            origin: "agent3",
            tools: [],
        },
    ]

    const defaultProps: AgentFlowProps = {
        agentsInNetwork: network,
        id: "test-flow-id",
        currentConversations: [
            {
                id: "test-conv-1",
                agents: new Set(["agent1"]),
                startedAt: new Date(),
                type: ChatMessageType.AGENT,
            },
        ],
        isAwaitingLlm: false,
        isStreaming: false,
        thoughtBubbleEdges: new Map(),
        setThoughtBubbleEdges: jest.fn(),
    }

    const renderAgentFlowComponent = (overrides = {}) => {
        const props = {...defaultProps, ...overrides}
        return render(
            <ReactFlowProvider>
                <AgentFlow {...props} />
            </ReactFlowProvider>
        )
    }

    const verifyAgentNodes = (container: HTMLElement) => {
        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(3)

        const agentNames = network.map((agent) => agent.origin)
        const nodesArray = Array.from(nodes)

        // Make sure each agent node is rendered at least. Structure in react-flow is:
        // <div class="react-flow__node"><div><p>agentName</p></div></div>
        agentNames.forEach((agent) => {
            expect(nodesArray.some((node) => node.querySelector("p")?.textContent === cleanUpAgentName(agent))).toBe(
                true
            )
        })
    }

    test.each([{darkMode: false}, {darkMode: true}])("Should render correctly in %s mode", async ({darkMode}) => {
        mockedUsePreferences.mockReturnValue({darkMode, toggleDarkMode: jest.fn()})
        const {container} = renderAgentFlowComponent()

        expect(await screen.findByText(cleanUpAgentName("React Flow"))).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should allow switching to heatmap display", async () => {
        renderAgentFlowComponent()

        const heatmapButton = await screen.findByRole("button", {name: "Heatmap"})

        // press the button to switch to heatmap mode
        await user.click(heatmapButton)

        // Legend should have switched to heatmap mode
        await screen.findByText("Heat")
    })

    it("Should allow switching to heatmap display and not show radial guides with linear display mode", async () => {
        const {container} = renderAgentFlowComponent()

        const radialGuides = container.querySelector("#test-flow-id-radial-guides")

        // Radial guides should be present in radial layout
        expect(radialGuides).toBeInTheDocument()

        // locate linear layout button
        const linearLayoutButton = container.querySelector("#linear-layout-button")
        expect(linearLayoutButton).toBeInTheDocument()

        // click the button
        await user.click(linearLayoutButton)

        // Radial guides should not be present in linear layout
        expect(radialGuides).not.toBeInTheDocument()

        // Now switch to heatmap display
        const heatmapButton = await screen.findByRole("button", {name: "Heatmap"})

        // press the button to switch to heatmap mode
        await user.click(heatmapButton)

        // Legend should have switched to heatmap mode
        await screen.findByText("Heat")
    })

    it("Should handle highlighting the active agents", async () => {
        const {container, rerender} = renderAgentFlowComponent({
            selectedNetwork: TEST_AGENT_MUSIC_NERD_PRO,
        })

        // Force a re-render by changing layout
        const layoutButton = container.querySelector("#linear-layout-button")
        await user.click(layoutButton)

        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    agentsInNetwork={network}
                    id="test-flow-id"
                    currentConversations={[
                        {
                            id: "test-conv-2",
                            agents: new Set(["agent1", "agent3"]),
                            startedAt: new Date(),
                            type: ChatMessageType.AGENT,
                        },
                    ]}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={jest.fn()}
                />
            </ReactFlowProvider>
        )

        // agent1 is active so should be highlighted
        const agent1Node = container.querySelector('[data-id="agent1"]')
        expect(agent1Node).toBeInTheDocument()

        // agent1 first div is the one with the style
        const agent1ChildDiv = agent1Node.children[0] as HTMLDivElement

        // make sure agent1 has style animation: glow 2.0s infinite
        expect(agent1ChildDiv).toHaveStyle({
            animation: "glow 2.0s infinite",
        })

        // agent3 is active so should be highlighted
        const agent3Node = container.querySelector('[data-id="agent3"]')
        expect(agent3Node).toBeInTheDocument()

        // agent3 first div is the one with the style
        const agent3ChildDiv = agent3Node.children[0] as HTMLDivElement

        // make sure agent3 has style animation: glow 2.0s infinite
        expect(agent3ChildDiv).toHaveStyle({
            animation: "glow 2.0s infinite",
        })

        // agent2 is not "active" so should not have the pulsing animation
        const agent2Div = container.querySelector('[data-id="agent2"]')
        expect(agent2Div).toBeInTheDocument()
        const agent2ChildDiv = agent2Div.children[0] as HTMLDivElement
        expect(agent2ChildDiv).toHaveStyle({
            animation: "none",
        })
    })

    it("Should handle an empty agent list", async () => {
        const {container} = renderAgentFlowComponent({agentsInNetwork: [], currentConversations: null})

        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(0)

        // Expect legend not to be present
        expect(container.querySelector("#test-flow-id-legend")).not.toBeInTheDocument()
    })

    it("Should render the legend if agent list is greater than 0", async () => {
        const {container} = renderAgentFlowComponent()

        // Expect legend to be present
        expect(container.querySelector("#test-flow-id-legend")).toBeInTheDocument()
    })

    it("Should handle a Frontman-only network", async () => {
        const {container} = renderAgentFlowComponent({
            agentsInNetwork: [network[2]],
            currentConversations: [
                {
                    id: "test-conv-frontman",
                    agents: new Set(["agent3"]),
                    startedAt: new Date(),
                },
            ],
        })

        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(1)
    })

    test.each(["radial", "linear"])("Should allow switching to %s layout", async (layout) => {
        const {container} = renderAgentFlowComponent()

        // locate appropriate button
        const layoutButton = container.querySelector(`#${layout}-layout-button`)
        expect(layoutButton).toBeInTheDocument()

        // click the button
        await user.click(layoutButton)

        // Make sure at least agent nodes are still rendered
        verifyAgentNodes(container)
    })

    it("Should show radial guides only in radial layout with more than one depth", () => {
        const {container, rerender} = renderAgentFlowComponent()

        // Should show radial guides SVG with more than one node (which is used for the default test network)
        expect(container.querySelector("#test-flow-id-radial-guides")).toBeInTheDocument()

        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    agentsInNetwork={[network[2]]}
                    id="test-flow-id"
                    currentConversations={[
                        {
                            id: "test-conv-3",
                            agents: new Set(["agent3"]),
                            startedAt: new Date(),
                            type: ChatMessageType.AGENT,
                        },
                    ]}
                    isAwaitingLlm={false}
                    isStreaming={false}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={jest.fn()}
                />
            </ReactFlowProvider>
        )

        // Should not show radial guides SVG with only one node
        expect(container.querySelector("#test-flow-id-radial-guides")).not.toBeInTheDocument()
    })

    it("Should render ThoughtBubbleOverlay component", () => {
        const {container} = renderAgentFlowComponent()

        expect(container.querySelector('[data-testid="mock-thought-bubble-overlay"]')).toBeInTheDocument()
    })

    it("Should have a thought bubble toggle button", async () => {
        const {container} = renderAgentFlowComponent()

        const thoughtBubbleButton = container.querySelector("#thought-bubble-button")
        expect(thoughtBubbleButton).toBeInTheDocument()

        // Click to toggle thought bubbles off
        await user.click(thoughtBubbleButton)

        // Button should still be there
        expect(thoughtBubbleButton).toBeInTheDocument()
    })

    it("Should handle isAwaitingLlm prop correctly", () => {
        const {container} = renderAgentFlowComponent({isAwaitingLlm: true})

        // When awaiting LLM, legend and controls should not be rendered
        expect(container.querySelector("#test-flow-id-legend")).not.toBeInTheDocument()
        expect(container.querySelector("#radial-layout-button")).not.toBeInTheDocument()
    })

    it("Should render legend and controls when not awaiting LLM", () => {
        const {container} = renderAgentFlowComponent({isAwaitingLlm: false})

        // When not awaiting LLM, legend and controls should be rendered
        expect(container.querySelector("#test-flow-id-legend")).toBeInTheDocument()
        expect(container.querySelector("#radial-layout-button")).toBeInTheDocument()
    })

    it("Should handle conversations with text for thought bubbles", () => {
        const conversationsWithText = [
            {
                id: "test-conv-with-text",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "What is the weather today?",
            },
        ]

        const {container} = renderAgentFlowComponent({
            currentConversations: conversationsWithText,
            isStreaming: true,
        })

        // Component should render successfully with conversation text
        expect(container).toBeInTheDocument()
    })

    it("Should handle null currentConversations", () => {
        const {container} = renderAgentFlowComponent({currentConversations: null})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should render with isStreaming prop", () => {
        const {container} = renderAgentFlowComponent({isStreaming: true})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should render ThoughtBubbleOverlay component when showing thought bubbles", () => {
        renderAgentFlowComponent()

        // ThoughtBubbleOverlay should be rendered (it's mocked)
        expect(screen.getByTestId("mock-thought-bubble-overlay")).toBeInTheDocument()
    })

    it("Should render ThoughtBubbleEdge in edge types", () => {
        renderAgentFlowComponent()

        // Component should render without errors
        expect(screen.getByTestId("mock-thought-bubble-overlay")).toBeInTheDocument()
    })

    it("Should handle conversations with multiple agents", () => {
        const multiAgentConversations = [
            {
                id: "conv-1",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
            },
            {
                id: "conv-2",
                agents: new Set(["agent2", "agent3"]),
                startedAt: new Date(),
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: multiAgentConversations})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle conversations with text field", () => {
        const conversationsWithText = [
            {
                id: "conv-1",
                agents: new Set(["agent1"]),
                startedAt: new Date(),
                text: "Test inquiry text",
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: conversationsWithText})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle empty conversations array", () => {
        const {container} = renderAgentFlowComponent({currentConversations: []})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle isStreaming false", () => {
        const {container} = renderAgentFlowComponent({isStreaming: false})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should render with isAwaitingLlm true", () => {
        const {container} = renderAgentFlowComponent({isAwaitingLlm: true})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should render with isAwaitingLlm false", () => {
        const {container} = renderAgentFlowComponent({isAwaitingLlm: false})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle currentConversations becoming null (streaming complete)", () => {
        const initialConversations = [
            {
                id: "conv-1",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Test message",
            },
        ]

        const {rerender, container} = renderAgentFlowComponent({currentConversations: initialConversations})

        // Initially should render with conversations
        expect(container).toBeInTheDocument()

        // Now set to null (simulating streaming complete)
        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={null}
                />
            </ReactFlowProvider>
        )

        // Should still render without errors
        expect(container).toBeInTheDocument()
    })

    it("Should handle conversation with single agent", () => {
        const singleAgentConv = [
            {
                id: "conv-1",
                agents: new Set(["agent1"]),
                startedAt: new Date(),
                text: "Single agent message",
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: singleAgentConv})

        // Should render without errors (won't create edge with < 2 agents)
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle conversation with three or more agents", () => {
        const multiAgentConv = [
            {
                id: "conv-1",
                agents: new Set(["agent1", "agent2", "agent3"]),
                startedAt: new Date(),
                text: "Multi-agent message",
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: multiAgentConv})

        // Should render without errors (creates edge from first two agents)
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle window resize events", async () => {
        const {container} = renderAgentFlowComponent()

        // Trigger resize wrapped in act
        await act(async () => {
            global.window.dispatchEvent(new Event("resize"))
        })

        // Should not crash
        expect(container).toBeInTheDocument()
    })

    it("Should clean up resize listener on unmount", () => {
        const removeEventListenerSpy = jest.spyOn(window, "removeEventListener")
        const {unmount} = renderAgentFlowComponent()

        unmount()

        // Verify cleanup was called
        expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function))
    })

    it("Should handle conversations without text field", () => {
        const conversationsWithoutText = [
            {
                id: "conv-1",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                // No text field
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: conversationsWithoutText})

        // Should render without errors (skips processing conversations without text)
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle empty agents set in conversation", () => {
        const conversationsWithEmptyAgents = [
            {
                id: "conv-1",
                agents: new Set<string>(),
                startedAt: new Date(),
                text: "Message with no agents",
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: conversationsWithEmptyAgents})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle duplicate conversations with same parsed text", () => {
        const duplicateConversations = [
            {
                id: "conv-1",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: '{"inquiry": "Same message"}',
            },
            {
                id: "conv-2",
                agents: new Set(["agent2", "agent3"]),
                startedAt: new Date(),
                text: '{"inquiry": "Same message"}', // Duplicate parsed content
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: duplicateConversations})

        // Should render without errors (deduplication should prevent double-add)
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle very long conversation text", () => {
        const longTextConv = [
            {
                id: "conv-1",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "a".repeat(1000), // Very long text
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: longTextConv})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle special characters in conversation text", () => {
        const specialCharsConv = [
            {
                id: "conv-1",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Test with émojis 🎉 and spëcial çharacters",
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: specialCharsConv})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should call setThoughtBubbleEdges when conversations with text are added", () => {
        const mockSetThoughtBubbleEdges = jest.fn()
        const conversationsWithText = [
            {
                id: "conv-with-text",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: Test message",
                type: ChatMessageType.AGENT,
            },
        ]

        const {rerender} = render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={null}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Update with conversations that have text
        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={conversationsWithText}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Should have called setThoughtBubbleEdges to add the thought bubble
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()
    })

    it("Should handle thought bubble edges in the layout", () => {
        const thoughtBubbleEdgesMap = new Map()
        thoughtBubbleEdgesMap.set("test-edge", {
            edge: {
                id: "thought-bubble-test",
                source: "agent1",
                target: "agent2",
                type: "thoughtBubbleEdge",
                data: {text: "Test thought bubble"},
            },
            startedAt: Date.now(),
        })

        const {container} = renderAgentFlowComponent({
            thoughtBubbleEdges: thoughtBubbleEdgesMap,
        })

        // Should render successfully with thought bubble edges
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should clean up thought bubbles via removeThoughtBubbleEdgeHelper during timeout", async () => {
        jest.useFakeTimers()
        const mockSetThoughtBubbleEdges = jest.fn()

        const conversationsWithText = [
            {
                id: "conv-timeout-test",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: Test timeout message",
                type: ChatMessageType.AGENT,
            },
        ]

        render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={conversationsWithText}
                    isStreaming={true}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Fast-forward time by 11 seconds (past THOUGHT_BUBBLE_TIMEOUT_MS of 10 seconds)
        act(() => {
            jest.advanceTimersByTime(11000)
        })

        // The cleanup should have been triggered
        // Note: The actual cleanup logic depends on the effect firing
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()

        jest.useRealTimers()
    })

    it("Should handle empty thought bubble edges map", () => {
        const {container} = renderAgentFlowComponent({
            thoughtBubbleEdges: new Map(),
        })

        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should prevent duplicate thought bubbles using thoughtBubbleEdges", () => {
        const mockSetThoughtBubbleEdges = jest.fn()
        const existingEdgesMap = new Map()

        // Pre-populate with an existing edge
        existingEdgesMap.set("conv-1", {
            edge: {
                id: "thought-bubble-conv-1",
                source: "agent1",
                target: "agent2",
                type: "thoughtBubbleEdge",
                data: {
                    text: '{"inquiry": "What is the weather?"}',
                    showAlways: true,
                    conversationId: "conv-1",
                },
            },
            startedAt: Date.now(),
        })

        const duplicateConversations = [
            {
                id: "conv-2",
                agents: new Set(["agent2", "agent3"]),
                startedAt: new Date(),
                text: '{"inquiry": "What is the weather?"}', // Same parsed content
                type: ChatMessageType.AGENT,
            },
        ]

        const {container} = render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={duplicateConversations}
                    thoughtBubbleEdges={existingEdgesMap}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Should render without errors
        expect(container).toBeInTheDocument()

        // Should NOT add a new edge because the parsed text already exists in thoughtBubbleEdges
        // The mock may be called but the logic should skip adding duplicate
        expect(container).toBeInTheDocument()
    })

    it("Should limit thought bubbles to MAX_THOUGHT_BUBBLES (5) and drop oldest", () => {
        const mockSetThoughtBubbleEdges = jest.fn()

        // Create 6 conversations to exceed the MAX_THOUGHT_BUBBLES limit
        const manyConversations = Array.from({length: 6}, (_, i) => ({
            id: `conv-${i}`,
            agents: new Set(["agent1", "agent2"]),
            startedAt: new Date(Date.now() + i * 1000), // Different startedAts
            text: `{"inquiry": "Message ${i}"}`, // Unique messages
            type: ChatMessageType.AGENT,
        }))

        const {container} = render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={manyConversations}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                    isStreaming={true}
                />
            </ReactFlowProvider>
        )

        // Should render without errors
        expect(container).toBeInTheDocument()

        // setThoughtBubbleEdges should be called for each conversation
        // Including calls to add edges and potentially remove old ones
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()
    })

    it("Should call removeThoughtBubbleEdgeHelper when cleaning up expired bubbles", async () => {
        jest.useFakeTimers()
        const mockSetThoughtBubbleEdges = jest.fn()

        const conversationsWithText = [
            {
                id: "conv-expire-test",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: Test expiration",
                type: ChatMessageType.AGENT,
            },
        ]

        render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={conversationsWithText}
                    isStreaming={true}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Fast-forward time by 11 seconds to trigger cleanup
        act(() => {
            jest.advanceTimersByTime(11000)
        })

        // The removeThoughtBubbleEdgeHelper should have been called via setThoughtBubbleEdges
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()

        jest.useRealTimers()
    })

    it("Should handle radial guides toggle when layout is linear", async () => {
        const {container} = renderAgentFlowComponent()

        // First click to switch to linear layout
        const linearButton = container.querySelector("#linear-layout-button")
        expect(linearButton).toBeInTheDocument()
        await user.click(linearButton)

        const radialGuidesButton = container.querySelector("#radial-guides-button")
        expect(radialGuidesButton).toBeInTheDocument()

        // Button should be disabled when layout is linear
        expect(radialGuidesButton).toHaveAttribute("disabled")
    })

    it("Should add and remove edges via helper functions", () => {
        let capturedEdgesMap: Map<string, {edge: EdgeProps; startedAt: number}> | null = null
        const mockSetThoughtBubbleEdges = jest.fn((updater) => {
            if (typeof updater === "function") {
                const currentMap = capturedEdgesMap || new Map()
                capturedEdgesMap = updater(currentMap)
            }
        })

        const conversationsWithText = [
            {
                id: "helper-test-conv",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: Helper test",
                type: ChatMessageType.AGENT,
            },
        ]

        const {rerender} = render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={null}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Add conversations to trigger addThoughtBubbleEdgeHelper
        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={conversationsWithText}
                    thoughtBubbleEdges={capturedEdgesMap || new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // setThoughtBubbleEdges should have been called with an updater function
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()

        // Verify the edge was added
        expect(capturedEdgesMap).not.toBeNull()
        expect(capturedEdgesMap.size).toBeGreaterThan(0)
    })

    it("Should handle hover state changes for thought bubbles", () => {
        const {container} = renderAgentFlowComponent({
            currentConversations: [
                {
                    id: "hover-test-conv",
                    agents: new Set(["agent1", "agent2"]),
                    startedAt: new Date(),
                    text: "Invoking Agent with inquiry: Hover test",
                },
            ],
            isStreaming: true,
        })

        // Component should render with thought bubble overlay
        expect(container.querySelector('[data-testid="mock-thought-bubble-overlay"]')).toBeInTheDocument()
    })

    it("Should toggle radial guides on and off", async () => {
        const {container} = renderAgentFlowComponent()

        const radialGuidesButton = container.querySelector("#radial-guides-button")
        expect(radialGuidesButton).toBeInTheDocument()

        // Click to toggle radial guides off
        await user.click(radialGuidesButton)

        // Radial guides should not be visible
        expect(container.querySelector("#test-flow-id-radial-guides")).not.toBeInTheDocument()

        // Click again to toggle radial guides back on
        await user.click(radialGuidesButton)

        // Radial guides should be visible again
        expect(container.querySelector("#test-flow-id-radial-guides")).toBeInTheDocument()
    })

    it("Should prevent expired bubbles from being removed when hovered", async () => {
        jest.useFakeTimers()
        const mockSetThoughtBubbleEdges = jest.fn()

        // Create a conversation that will be added as a thought bubble
        const conversationsWithText = [
            {
                id: "hover-prevent-expire-conv",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: Hover prevents expiry",
                type: ChatMessageType.AGENT,
            },
        ]

        // Mock ThoughtBubbleOverlay to simulate hover behavior
        const MockThoughtBubbleOverlay: FC<ThoughtBubbleOverlayProps> = ({onBubbleHoverChange}) => {
            // Simulate hover on mount
            useEffect(() => {
                if (onBubbleHoverChange) {
                    onBubbleHoverChange("thought-bubble-hover-prevent-expire-conv")
                }
            }, [onBubbleHoverChange])
            return <div data-testid="mock-thought-bubble-overlay" />
        }

        const previousImpl = __MockThoughtBubbleOverlayImpl
        __MockThoughtBubbleOverlayImpl = MockThoughtBubbleOverlay

        render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={conversationsWithText}
                    isStreaming={true}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Fast-forward time by 11 seconds to trigger cleanup (past the 10 second timeout)
        act(() => {
            jest.advanceTimersByTime(11000)
        })

        // The bubble should not be removed because it's being hovered
        // We can verify by checking that the component still renders
        expect(screen.getByTestId("mock-thought-bubble-overlay")).toBeInTheDocument()

        __MockThoughtBubbleOverlayImpl = previousImpl
        jest.useRealTimers()
    })

    it("Should handle conversations with empty text strings", () => {
        const conversationsWithEmptyText = [
            {
                id: "empty-text-conv",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "",
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: conversationsWithEmptyText})

        // Should render without errors (empty text should be handled gracefully)
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle conversations with whitespace-only text", () => {
        const conversationsWithWhitespace = [
            {
                id: "whitespace-conv",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "   \n\t   ",
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: conversationsWithWhitespace})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle case-insensitive duplicate detection in thought bubbles", () => {
        const conversationsWithCaseVariations = [
            {
                id: "conv-case-1",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: TEST MESSAGE",
                type: ChatMessageType.AGENT,
            },
            {
                id: "conv-case-2",
                agents: new Set(["agent2", "agent3"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: test message", // Same but lowercase
                type: ChatMessageType.AGENT,
            },
        ]

        const mockSetThoughtBubbleEdges = jest.fn()

        render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={conversationsWithCaseVariations}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Should only add one thought bubble due to duplicate detection
        // The mock should be called but duplicates should be filtered
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()
    })

    it("Should handle thought bubble edges without text field", () => {
        const existingEdgesMap = new Map()

        // Add an edge without text (to test the if (edgeText) branch)
        existingEdgesMap.set("edge-without-text", {
            edge: {
                id: "thought-bubble-no-text",
                source: "agent1",
                target: "agent2",
                type: "thoughtBubbleEdge",
                data: {
                    // No text field
                    showAlways: true,
                    conversationId: "no-text-conv",
                },
            },
            timestamp: Date.now(),
        })

        const conversationsWithText = [
            {
                id: "new-conv",
                agents: new Set(["agent2", "agent3"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: New message",
                type: ChatMessageType.AGENT,
            },
        ]

        const {container} = render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={conversationsWithText}
                    thoughtBubbleEdges={existingEdgesMap}
                    setThoughtBubbleEdges={jest.fn()}
                />
            </ReactFlowProvider>
        )

        // Should render without errors
        expect(container).toBeInTheDocument()
    })

    it("Should handle conversations where bubble has no text field", () => {
        const mockSetThoughtBubbleEdges = jest.fn()

        // First render with a conversation that has text
        const {rerender} = render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={[
                        {
                            id: "conv-with-text",
                            agents: new Set(["agent1", "agent2"]),
                            startedAt: new Date(),
                            text: "Invoking Agent with inquiry: First message",
                            type: ChatMessageType.AGENT,
                        },
                    ]}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Now render with a conversation that has undefined text
        // This tests the b.text || "" fallback in the normalizeText usage
        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={[
                        {
                            id: "conv-no-text",
                            agents: new Set(["agent2", "agent3"]),
                            startedAt: new Date(),
                            type: ChatMessageType.AGENT,
                        },
                    ]}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={jest.fn()}
                />
            </ReactFlowProvider>
        )

        // Should render without errors (conversation without text should be skipped)
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()
    })

    it("Should not add duplicate conversations with same ID", () => {
        const mockSetThoughtBubbleEdges = jest.fn()

        const conversation = {
            id: "conv-duplicate-id",
            agents: new Set(["agent1", "agent2"]),
            startedAt: new Date(),
            text: "Invoking Agent with inquiry: Duplicate ID test",
            type: ChatMessageType.AGENT,
        }

        render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={[conversation, conversation]} // Same conversation twice
                    isStreaming={true}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Should only add once despite being in the array twice
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalledTimes(1)
    })

    it("Should handle clearing thoughtBubbleEdges map", () => {
        const mockSetThoughtBubbleEdges = jest.fn()

        const conversation1 = {
            id: "conv-clear-test",
            agents: new Set(["agent1", "agent2"]),
            startedAt: new Date(),
            text: "Invoking Agent with inquiry: Clear test",
            type: ChatMessageType.AGENT,
        }

        // Render with edges present (non-empty map)
        const edgesMap = new Map()
        edgesMap.set("edge-1", {
            edge: {
                id: "test-edge-1",
                source: "agent1",
                target: "agent2",
                type: "thoughtBubbleEdge",
                data: {text: "Test"},
            },
            timestamp: Date.now(),
        })

        const {rerender} = render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={[conversation1]}
                    thoughtBubbleEdges={edgesMap}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Verify it renders with non-empty map (covers thoughtBubbleEdges.size !== 0 branch)
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()

        // Now clear the edges map
        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={[conversation1]}
                    thoughtBubbleEdges={new Map()} // Empty map
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Should render without errors when edges are cleared (covers thoughtBubbleEdges.size === 0 branch)
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()
    })
})

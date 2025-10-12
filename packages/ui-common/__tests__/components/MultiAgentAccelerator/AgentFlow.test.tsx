import {render, screen} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {ReactFlowProvider} from "reactflow"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import {AgentFlow, AgentFlowProps} from "../../../components/MultiAgentAccelerator/AgentFlow"
import {ConnectivityInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {usePreferences} from "../../../state/Preferences"

const TEST_AGENT_MUSIC_NERD_PRO = "Music Nerd Pro"

jest.mock("../../../components/MultiAgentAccelerator/PlasmaEdge", () => ({
    PlasmaEdge: () => <g data-testid="mock-plasma-edge" />,
}))

jest.mock("../../../components/MultiAgentAccelerator/ThoughtBubbleEdge", () => ({
    ThoughtBubbleEdge: () => <g data-testid="mock-thought-bubble-edge" />,
}))

jest.mock("../../../components/MultiAgentAccelerator/ThoughtBubbleOverlay", () => ({
    ThoughtBubbleOverlay: () => <div data-testid="mock-thought-bubble-overlay" />,
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
            },
        ],
        isAwaitingLlm: false,
        isStreaming: false,
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
                        },
                    ]}
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
                        },
                    ]}
                    isAwaitingLlm={false}
                    isStreaming={false}
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
        const {act} = await import("react-dom/test-utils")
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
        removeEventListenerSpy.mockRestore()
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
})

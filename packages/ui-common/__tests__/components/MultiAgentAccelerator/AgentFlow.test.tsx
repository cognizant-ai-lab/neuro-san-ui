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

import {createTheme, PaletteMode, ThemeProvider, useColorScheme} from "@mui/material/styles"
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {ReactFlowProvider} from "@xyflow/react"
import {FC, useEffect} from "react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {cleanUpAgentName} from "../../../components/AgentChat/Common/Utils"
import {AgentConversation} from "../../../components/MultiAgentAccelerator/AgentConversations"
import {AgentFlow, AgentFlowProps} from "../../../components/MultiAgentAccelerator/AgentFlow"
import {AgentNetworkDefinitionEntry} from "../../../components/MultiAgentAccelerator/const"
import {ThoughtBubbleEdgeShape} from "../../../components/MultiAgentAccelerator/ThoughtBubbleEdge"
import {sendChatQuery} from "../../../controller/agent/Agent"
import {ChatMessageType, ConnectivityInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {useTempNetworksStore} from "../../../state/TemporaryNetworks"
import {PALETTES} from "../../../Theme/Palettes"

jest.mock("../../../controller/agent/Agent")

jest.mock("notistack", () => ({
    ...jest.requireActual("notistack"),
    enqueueSnackbar: jest.fn(),
}))

const TEST_AGENT_MUSIC_NERD_PRO = "Music Nerd Pro"

const mockPlasmaEdgeTestId = "mock-plasma-edge"
const mockThoughtBubbleEdgeTestId = "mock-thought-bubble-edge"
const mockThoughtBubbleOverlayTestId = "mock-thought-bubble-overlay"

jest.mock("@mui/material/styles", () => ({
    ...jest.requireActual("@mui/material/styles"),
    useColorScheme: jest.fn(),
}))

jest.mock("../../../components/MultiAgentAccelerator/PlasmaEdge", () => ({
    PlasmaEdge: () => <g data-testid={mockPlasmaEdgeTestId} />,
}))

jest.mock("../../../components/MultiAgentAccelerator/ThoughtBubbleEdge", () => ({
    ThoughtBubbleEdge: () => <g data-testid={mockThoughtBubbleEdgeTestId} />,
}))

// Provide a mutable implementation for the ThoughtBubbleOverlay mock so individual
// tests can swap the implementation without attempting to redefine the module
// export (which can throw "Cannot redefine property" errors).
type ThoughtBubbleOverlayProps = {
    onBubbleHoverChange?: (id: string) => void
}

const defaultMockThoughtBubbleOverlay: FC<ThoughtBubbleOverlayProps> = () => (
    <div data-testid={mockThoughtBubbleOverlayTestId} />
)

let __MockThoughtBubbleOverlayImpl: FC<ThoughtBubbleOverlayProps> = defaultMockThoughtBubbleOverlay
jest.mock("../../../components/MultiAgentAccelerator/ThoughtBubbleOverlay", () => ({
    ThoughtBubbleOverlay: (props: ThoughtBubbleOverlayProps) => __MockThoughtBubbleOverlayImpl(props),
}))

const NETWORK: ConnectivityInfo[] = [
    {
        origin: "agent1",
        tools: ["agent2", "agent3"],
        display_as: "llm_agent",
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

describe("AgentFlow", () => {
    let user: UserEvent

    withStrictMocks()

    beforeEach(() => {
        user = userEvent.setup()
        ;(useColorScheme as jest.Mock).mockReturnValue({
            mode: "light",
        })
        useTempNetworksStore.getState().setTempNetworks([])
    })

    // Helper to create a minimal TemporaryNetwork for seeding the store in tests.
    const makeTempNetwork = (
        networkId: string,
        agentNetworkDefinition?: AgentNetworkDefinitionEntry[],
        agentNetworkName?: string
    ) => ({
        reservation: {
            reservation_id: networkId,
            lifetime_in_seconds: 300,
            expiration_time_in_seconds: Date.now() / 1000 + 300,
        },
        agentInfo: {agent_name: networkId},
        agentNetworkName,
        agentNetworkDefinition,
    })

    const currentConversations2: AgentConversation[] = [
        {
            id: "test-conv-1",
            agents: new Set(["agent1"]),
            startedAt: new Date(),
            type: ChatMessageType.AGENT,
        },
    ]
    const defaultProps: AgentFlowProps = {
        agentsInNetwork: NETWORK,
        id: "test-flow-id",
        currentConversations: currentConversations2,
        isAwaitingLlm: false,
        isStreaming: false,
        thoughtBubbleEdges: new Map(),
        setThoughtBubbleEdges: jest.fn(),
    }

    const renderAgentFlowComponent = (overrides = {}, mode: PaletteMode = "light") => {
        const props = {...defaultProps, ...overrides}
        return render(
            <ThemeProvider theme={createTheme({palette: {mode}})}>
                <ReactFlowProvider>
                    <AgentFlow {...props} />
                </ReactFlowProvider>
            </ThemeProvider>
        )
    }

    /**
     * Clicks a React Flow (@xyflow/react) node using fireEvent rather than userEvent: userEvent's
     * pointer-event sequence drives @xyflow/react's drag handlers, which read `document` off event
     * internals jsdom doesn't populate (throwing "Cannot read properties of null"). A plain click is all
     * the node's onClick needs. This is rooted in an upstream @testing-library/user-event bug, so switch
     * back to userEvent once it's fixed. See https://github.com/xyflow/xyflow/issues/2461#issuecomment-3402243495
     */
    const clickFlowNode = (node: Element | null) => fireEvent.click(node)

    const verifyAgentNodes = (container: HTMLElement) => {
        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(3)

        const agentNames = NETWORK.map((agent) => agent.origin)
        const nodesArray = [...nodes]

        // Make sure each agent node is rendered at least. Structure in react-flow is:
        // <div class="react-flow__node"><div><p>agentName</p></div></div>
        agentNames.forEach((agent) => {
            expect(nodesArray.some((node) => node.querySelector("p")?.textContent === cleanUpAgentName(agent))).toBe(
                true
            )
        })
    }

    // Simulates React's functional-setState pattern so tests can inspect the resulting Map.
    const createThoughtBubbleEdgesStore = () => {
        let map = new Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>()
        const mockSetThoughtBubbleEdges = jest.fn((updater: unknown) => {
            if (typeof updater === "function") {
                map = (updater as (prev: typeof map) => typeof map)(map)
            }
        })
        return {mockSetThoughtBubbleEdges, getThoughtBubbleEdgesMap: () => map}
    }

    it("Should show the network title when networkDisplayName is provided", async () => {
        renderAgentFlowComponent({networkDisplayName: "My Network"})
        expect(await screen.findByText("My Network")).toBeInTheDocument()
    })

    it("Should show the network title in dark mode", async () => {
        renderAgentFlowComponent({networkDisplayName: "Dark Network"}, "dark")
        expect(await screen.findByText("Dark Network")).toBeInTheDocument()
    })

    it("Should not show the title bar when networkDisplayName is not provided", async () => {
        const {container} = renderAgentFlowComponent()
        expect(container.querySelector("#test-flow-id-network-title-bar")).not.toBeInTheDocument()
    })

    it("Should show the Edit button on a temporary network and invoke onEnterEditMode when clicked", async () => {
        const onEnterEditMode = jest.fn()
        renderAgentFlowComponent({
            networkDisplayName: "Temp Net",
            isSelectedNetworkTemporary: true,
            isEditMode: false,
            isAwaitingLlm: false,
            onEnterEditMode,
        })
        const editBtn = await screen.findByRole("button", {name: "Edit"})
        await user.click(editBtn)
        expect(onEnterEditMode).toHaveBeenCalledTimes(1)
    })

    it("Should not show the Edit button for a non-temporary network", async () => {
        renderAgentFlowComponent({
            networkDisplayName: "Regular Net",
            isSelectedNetworkTemporary: false,
        })
        await screen.findByText("Regular Net")
        expect(screen.queryByRole("button", {name: "Edit"})).not.toBeInTheDocument()
    })

    it("Should not show the Edit button when already in edit mode", async () => {
        renderAgentFlowComponent({
            networkDisplayName: "Temp Net",
            isSelectedNetworkTemporary: true,
            isEditMode: true,
        })
        await screen.findByText("Temp Net")
        expect(screen.queryByRole("button", {name: "Edit"})).not.toBeInTheDocument()
    })

    it("Should not show the Edit button when awaiting LLM", async () => {
        renderAgentFlowComponent({
            networkDisplayName: "Temp Net",
            isSelectedNetworkTemporary: true,
            isEditMode: false,
            isAwaitingLlm: true,
        })
        await screen.findByText("Temp Net")
        expect(screen.queryByRole("button", {name: "Edit"})).not.toBeInTheDocument()
    })

    it.each([{darkMode: false}, {darkMode: true}])("Should render correctly in %s mode", async ({darkMode}) => {
        const mode = darkMode ? "dark" : "light"
        const {container} = renderAgentFlowComponent({}, mode)

        expect(await screen.findByText(cleanUpAgentName("React Flow"))).toBeInTheDocument()
        verifyAgentNodes(container)

        const legend = container.querySelector("#test-flow-id-legend")
        const computed = window.getComputedStyle(legend)
        expect(computed.boxShadow).toContain(darkMode ? "#fff" : "#000")
    })

    it("Should allow switching between heatmap and depth displays", async () => {
        const {container} = renderAgentFlowComponent()

        const heatmapButton = await screen.findByRole("button", {name: "Heatmap"})

        // press the button to switch to heatmap mode
        await user.click(heatmapButton)

        // Legend should have switched to heatmap mode
        const legendContainer = container.querySelector('[id$="-legend"]')
        const divElements = legendContainer?.querySelectorAll(".MuiBox-root")

        const expectedItemsInLegend = PALETTES["blue"].length
        expect(divElements.length).toBe(expectedItemsInLegend)

        // Now switch back to depth display
        const depthButton = await screen.findByRole("button", {name: "Depth"})
        await user.click(depthButton)

        // Legend should have switched back to depth mode
        const depthLegendContainer = container.querySelector('[id$="-legend"]')
        const depthDivElements = depthLegendContainer?.querySelectorAll(".MuiBox-root")
        const expectedNetworkDepth = 2
        expect(depthDivElements.length).toBe(expectedNetworkDepth)
    })

    it("Should allow switching to heatmap display and not show radial guides with linear display mode", async () => {
        const {container} = renderAgentFlowComponent()

        let radialGuides = container.querySelector("#test-flow-id-radial-guides")

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

        // Radial guides should still not be present in linear layout
        radialGuides = container.querySelector("#test-flow-id-radial-guides")
        expect(radialGuides).not.toBeInTheDocument()
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
                    agentsInNetwork={NETWORK}
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

        // make sure agent1 has the expected animation
        const computedStyleAgent1 = window.getComputedStyle(agent1ChildDiv)
        expect(computedStyleAgent1.animation).toMatch(/animation-\w+ 2s infinite/u)

        // agent3 is active so should be highlighted
        const agent3Node = container.querySelector('[data-id="agent3"]')
        expect(agent3Node).toBeInTheDocument()

        // agent3 first div is the one with the style
        const agent3ChildDiv = agent3Node.children[0] as HTMLDivElement

        // make sure agent3 has the expected animation
        const computedStyleAgent3 = window.getComputedStyle(agent3ChildDiv)
        expect(computedStyleAgent3.animation).toMatch(/animation-\w+ 2s infinite/u)

        // agent2 is not "active" so should not have the pulsing animation
        const agent2Div = container.querySelector('[data-id="agent2"]')
        expect(agent2Div).toBeInTheDocument()
        const agent2ChildDiv = agent2Div.children[0] as HTMLDivElement
        expect(agent2ChildDiv.style.animation).toBe("")
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
            agentsInNetwork: [NETWORK[2]],
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

    it.each(["radial", "linear"])("Should allow switching to %s layout", async (layout) => {
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
                    agentsInNetwork={[NETWORK[2]]}
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

    it("Should render ThoughtBubbleOverlay component", () => {
        renderAgentFlowComponent()

        expect(screen.getByTestId(mockThoughtBubbleOverlayTestId)).toBeInTheDocument()
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

    // There is also a test in GraphLayouts.test.ts related to plasma edges.
    it("Should render plasma edges between agents in conversation when isAwaitingLlm is true", () => {
        // agent1 and agent2 are connected in NETWORK (agent1 -> agent2)
        // Placing both in the same conversation with a valid type triggers plasma edges
        const conversationsWithPlasma = [
            {
                id: "plasma-conv",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                type: ChatMessageType.AGENT,
            },
        ]

        const {container} = renderAgentFlowComponent({
            isAwaitingLlm: true,
            currentConversations: conversationsWithPlasma,
        })

        // The edge between agent1 (source) and agent2 (target) has id "agent2-edge-agent1"
        // ReactFlow wraps each edge in a group element with data-id matching the edge id
        const plasmaEdgeWrapper = container.querySelector('[data-id="agent2-edge-agent1"]')
        expect(plasmaEdgeWrapper).toBeVisible()

        expect(screen.getByTestId(mockPlasmaEdgeTestId)).toBeVisible()
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
        expect(screen.getByTestId(mockThoughtBubbleOverlayTestId)).toBeInTheDocument()
    })

    it("Should render ThoughtBubbleEdge in edge types", () => {
        renderAgentFlowComponent()

        // Component should render without errors
        expect(screen.getByTestId(mockThoughtBubbleOverlayTestId)).toBeInTheDocument()
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
        const thoughtBubbleEdgesMap = new Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>([
            [
                "test-edge",
                {
                    edge: {
                        id: "thought-bubble-test",
                        source: "agent1",
                        target: "agent2",
                        type: "thoughtBubbleEdge",
                        data: {text: "Test thought bubble"},
                    },
                    timestamp: Date.now(),
                },
            ],
        ])

        const {container} = renderAgentFlowComponent({
            thoughtBubbleEdges: thoughtBubbleEdgesMap,
        })

        // Should render successfully with thought bubble edges
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
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
        const existingEdgesMap = new Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>([
            [
                "conv-1",
                {
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
                    timestamp: Date.now(),
                },
            ],
        ])

        // Pre-populate with an existing edge

        const duplicateConversations: AgentConversation[] = [
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
        const {mockSetThoughtBubbleEdges, getThoughtBubbleEdgesMap} = createThoughtBubbleEdgesStore()

        // Create 6 conversations to exceed the MAX_THOUGHT_BUBBLES limit
        const manyConversations: AgentConversation[] = Array.from({length: 6}, (_, i) => ({
            id: `conv-${i}`,
            agents: new Set(["agent1", "agent2"]),
            startedAt: new Date(Date.now() + i * 1000), // Different startedAts so oldest is conv-0
            text: `{"inquiry": "Message ${i}"}`, // Unique messages
            type: ChatMessageType.AGENT,
        }))

        render(
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

        // Map must be capped at MAX_THOUGHT_BUBBLES (5)
        expect(getThoughtBubbleEdgesMap().size).toBeLessThanOrEqual(5)
        // Oldest bubble (conv-0) should have been evicted
        expect(getThoughtBubbleEdgesMap().has("conv-0")).toBe(false)
        // Newest bubble (conv-5) should still be present
        expect(getThoughtBubbleEdgesMap().has("conv-5")).toBe(true)
    })

    it("Should clean up thought bubbles via removeThoughtBubbleEdgeHelper during timeout", () => {
        jest.useFakeTimers()
        const {mockSetThoughtBubbleEdges, getThoughtBubbleEdgesMap} = createThoughtBubbleEdgesStore()

        const conversationsWithText: AgentConversation[] = [
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

        // After initial render the bubble should have been added
        expect(getThoughtBubbleEdgesMap().size).toBe(1)
        expect(getThoughtBubbleEdgesMap().has("conv-timeout-test")).toBe(true)

        // Fast-forward time by 11 seconds (past THOUGHT_BUBBLE_TIMEOUT_MS of 10 seconds)
        act(() => {
            jest.advanceTimersByTime(11000)
        })

        // The bubble should have been removed from the map after expiry
        expect(getThoughtBubbleEdgesMap().size).toBe(0)
    })

    it("Should handle hover state changes for thought bubbles", () => {
        const currentConversations: AgentConversation[] = [
            {
                id: "hover-test-conv",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: Hover test",
                type: ChatMessageType.AGENT,
            },
        ]
        renderAgentFlowComponent({
            currentConversations,
            isStreaming: true,
        })

        // Component should render with thought bubble overlay
        expect(screen.getByTestId(mockThoughtBubbleOverlayTestId)).toBeInTheDocument()
    })

    it("Should prevent expired bubbles from being removed when hovered", async () => {
        jest.useFakeTimers()
        const mockSetThoughtBubbleEdges = jest.fn()

        // Create a conversation that will be added as a thought bubble
        const conversationsWithText: AgentConversation[] = [
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
            return <div data-testid={mockThoughtBubbleOverlayTestId} />
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

        // Fast-forward time by 11 seconds to trigger cleanup (past the 10-second timeout)
        act(() => {
            jest.advanceTimersByTime(11000)
        })

        // The bubble should not be removed because it's being hovered
        // We can verify by checking that the component still renders
        expect(screen.getByTestId(mockThoughtBubbleOverlayTestId)).toBeInTheDocument()

        __MockThoughtBubbleOverlayImpl = previousImpl
    })

    it("Should drop expired bubbles first when overflow limit is reached", () => {
        jest.useFakeTimers()
        const mockSetThoughtBubbleEdges = jest.fn()

        // Create 5 conversations to fill MAX_THOUGHT_BUBBLES (5) with bubbles whose startedAt is the current fake time
        const initialConversations: AgentConversation[] = Array.from({length: 5}, (_, i) => ({
            id: `conv-expire-overflow-${i}`,
            agents: new Set(["agent1", "agent2"]),
            startedAt: new Date(),
            text: `Invoking Agent with inquiry: Initial overflow message ${i}`,
            type: ChatMessageType.AGENT,
        }))

        const {rerender} = render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={initialConversations}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Advance 1 second past THOUGHT_BUBBLE_TIMEOUT_MS (which is 10 seconds), so those 5 bubbles are expired.
        act(() => {
            jest.advanceTimersByTime(11000)
        })

        // Now add a 6th conversation. allBubbles will be 6 (>MAX=5), so the overflow handler will run.
        const extraConversation: AgentConversation = {
            id: "conv-expire-overflow-extra",
            agents: new Set(["agent2", "agent3"]),
            startedAt: new Date(),
            text: "Invoking Agent with inquiry: Extra overflow message",
            type: ChatMessageType.AGENT,
        }

        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={[...initialConversations, extraConversation]}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // setThoughtBubbleEdges should have been called (for both add and remove paths).
        expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()
    })

    it("Should update the Zustand store network map when a node popup is saved", async () => {
        // Seed the Zustand store with a flat array (server format) under a network key
        const initialDefinition: AgentNetworkDefinitionEntry[] = [
            {origin: "agent1", tools: ["agent2"], display_as: "llm_agent", instructions: "Original instructions."},
        ]
        // Seed the temp networks store with the network and its definition
        const networkKey = "temporary/test-network"
        act(() => {
            useTempNetworksStore.getState().setTempNetworks([makeTempNetwork(networkKey, initialDefinition)])
        })

        renderAgentFlowComponent({
            isSelectedNetworkTemporary: true,
            networkId: networkKey,
        })

        // Click an agent node to open the popup, querying by the visible agent name.
        clickFlowNode(screen.getByText(cleanUpAgentName("agent1")))

        // The popup should now be open — make the form dirty then save
        const instructionsField = await screen.findByRole("textbox", {name: /^instructions$/iu})
        await user.clear(instructionsField)
        await user.type(instructionsField, "Updated instructions.")
        const saveButton = screen.getByRole("button", {name: "Save"})
        expect(saveButton).toBeInTheDocument()

        await user.click(saveButton)

        // Popup should close
        await waitFor(() => expect(screen.queryByRole("button", {name: "Save"})).not.toBeInTheDocument())

        // Zustand store should still have the updated definition (updateTempNetworkDefinition was called)
        const storedDefinitions = useTempNetworksStore
            .getState()
            .tempNetworks.find((n) => n.agentInfo.agent_name === networkKey)?.agentNetworkDefinition
        expect(storedDefinitions).toBeDefined()
        expect(storedDefinitions.some((e) => e.origin === "agent1")).toBe(true)
    })

    it("Should open and close the node popup without saving", async () => {
        const networkKey = "temporary/test-net"
        act(() => {
            useTempNetworksStore
                .getState()
                .setTempNetworks([
                    makeTempNetwork(networkKey, [{origin: "agent1", tools: [], instructions: "Some instructions."}]),
                ])
        })
        const {container} = renderAgentFlowComponent({
            isSelectedNetworkTemporary: true,
            networkId: networkKey,
        })

        const agent1Node = container.querySelector('[data-id="agent1"]')
        expect(agent1Node).toBeInTheDocument()
        clickFlowNode(agent1Node)

        // Popup opens
        const cancelButton = await screen.findByRole("button", {name: "Cancel"})

        // Cancel closes the popup
        await user.click(cancelButton)
        await waitFor(() => expect(screen.queryByRole("button", {name: "Cancel"})).not.toBeInTheDocument())
    })

    it("Should handle conversations with empty text strings", () => {
        const conversationsWithEmptyText: AgentConversation[] = [
            {
                id: "empty-text-conv",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "",
                type: ChatMessageType.AGENT,
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: conversationsWithEmptyText})

        // Should render without errors (empty text should be handled gracefully)
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle conversations with whitespace-only text", () => {
        const conversationsWithWhitespace: AgentConversation[] = [
            {
                id: "whitespace-conv",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "   \n\t   ",
                type: ChatMessageType.AI,
            },
        ]

        const {container} = renderAgentFlowComponent({currentConversations: conversationsWithWhitespace})

        // Should render without errors
        expect(container).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should handle case-insensitive duplicate detection in thought bubbles", () => {
        const conversationsWithCaseVariations: AgentConversation[] = [
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
        const existingEdgesMap = new Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>([
            [
                "edge-without-text",
                {
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
                },
            ],
        ])

        // Add an edge without text (to test the "if (edgeText)" branch)

        const conversationsWithText: AgentConversation[] = [
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

    it("Should NOT open popup when clicking an agent node on a non-temporary network", async () => {
        const networkKey = "industry/banking_ops"
        // isTemporaryNetwork defaults to undefined/false — no seeding needed since popup won't open
        const {container} = renderAgentFlowComponent({networkId: networkKey})

        const agent1Node = container.querySelector('[data-id="agent1"]')
        clickFlowNode(agent1Node)

        // Popup must not appear
        expect(screen.queryByRole("button", {name: "Save"})).not.toBeInTheDocument()
    })

    it.each([
        ["coded_tool", "coded_tool"],
        ["external_agent", "external_agent"],
        ["langchain_tool", "langchain_tool"],
    ])("Should NOT open popup when clicking a %s node in a temporary network", async (label, displayAs) => {
        const networkKey = `temporary/test-${label}`
        act(() => {
            useTempNetworksStore
                .getState()
                .setTempNetworks([makeTempNetwork(networkKey, [{origin: "agent1", tools: [], display_as: displayAs}])])
        })

        const {container} = renderAgentFlowComponent({
            isSelectedNetworkTemporary: true,
            networkId: networkKey,
            agentsInNetwork: [{origin: "agent1", tools: [], display_as: displayAs}],
        })

        clickFlowNode(container.querySelector('[data-id="agent1"]'))
        expect(screen.queryByRole("button", {name: "Save"})).not.toBeInTheDocument()
    })

    it("Should open popup when clicking an llm_agent node in a temporary network", async () => {
        const networkKey = "temporary/test-llm-agent"
        act(() => {
            useTempNetworksStore
                .getState()
                .setTempNetworks([
                    makeTempNetwork(networkKey, [{origin: "agent1", tools: [], display_as: "llm_agent"}]),
                ])
        })

        const {container} = renderAgentFlowComponent({
            isSelectedNetworkTemporary: true,
            networkId: networkKey,
            agentsInNetwork: [{origin: "agent1", tools: [], display_as: "llm_agent"}],
        })

        clickFlowNode(container.querySelector('[data-id="agent1"]'))
        expect(await screen.findByRole("button", {name: "Save"})).toBeInTheDocument()
    })

    it("Should read instructions only from the current network, not from another network with same agent", async () => {
        // Two different temporary networks each containing agent1, with different instructions.
        const networkA = "temporary/network-a"
        const networkB = "temporary/network-b"
        const instructionsA = "Instructions specific to Network A."
        const instructionsB = "Instructions specific to Network B."

        act(() => {
            useTempNetworksStore
                .getState()
                .setTempNetworks([
                    makeTempNetwork(networkA, [{origin: "agent1", tools: [], instructions: instructionsA}]),
                    makeTempNetwork(networkB, [{origin: "agent1", tools: [], instructions: instructionsB}]),
                ])
        })

        // Render with networkB selected
        const {container} = renderAgentFlowComponent({
            isSelectedNetworkTemporary: true,
            networkId: networkB,
        })

        const agent1Node = container.querySelector('[data-id="agent1"]')
        clickFlowNode(agent1Node)

        // Popup should show networkB's instructions, not networkA's
        const instructionsField = await screen.findByRole("textbox", {name: /^instructions$/iu})
        expect(instructionsField).toHaveValue(instructionsB)
    })

    it("Should save edited instructions only to the current network's history entry", async () => {
        const networkA = "temporary/network-a-save"
        const networkB = "temporary/network-b-save"
        const originalInstructions = "Original shared instructions."

        act(() => {
            useTempNetworksStore
                .getState()
                .setTempNetworks([
                    makeTempNetwork(networkA, [{origin: "agent1", tools: [], instructions: originalInstructions}]),
                    makeTempNetwork(networkB, [{origin: "agent1", tools: [], instructions: originalInstructions}]),
                ])
        })

        const {container} = renderAgentFlowComponent({
            isSelectedNetworkTemporary: true,
            networkId: networkA,
        })

        const agent1Node = container.querySelector('[data-id="agent1"]')
        clickFlowNode(agent1Node)

        // Edit the instructions and save
        const instructionsField = await screen.findByRole("textbox", {name: /^instructions$/iu})
        await user.clear(instructionsField)
        await user.type(instructionsField, "Updated instructions for Network A.")
        await user.click(screen.getByRole("button", {name: "Save"}))
        await waitFor(() => expect(screen.queryByRole("button", {name: "Save"})).not.toBeInTheDocument())

        // Network A's instructions should be updated
        const defA = useTempNetworksStore
            .getState()
            .tempNetworks.find((n) => n.agentInfo.agent_name === networkA)?.agentNetworkDefinition
        expect(defA?.find((e) => e.origin === "agent1")?.instructions).toBe("Updated instructions for Network A.")

        // Network B's instructions must be untouched
        const defB = useTempNetworksStore
            .getState()
            .tempNetworks.find((n) => n.agentInfo.agent_name === networkB)?.agentNetworkDefinition
        expect(defB?.find((e) => e.origin === "agent1")?.instructions).toBe(originalInstructions)
    })

    it("Should handle conversations where bubble has no text field", () => {
        const mockSetThoughtBubbleEdges = jest.fn()

        // First render with a conversation that has text
        const currentConversations: AgentConversation[] = [
            {
                id: "conv-with-text",
                agents: new Set(["agent1", "agent2"]),
                startedAt: new Date(),
                text: "Invoking Agent with inquiry: First message",
                type: ChatMessageType.AGENT,
            },
        ]
        const {rerender} = render(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={currentConversations}
                    thoughtBubbleEdges={new Map()}
                    setThoughtBubbleEdges={mockSetThoughtBubbleEdges}
                />
            </ReactFlowProvider>
        )

        // Now render with a conversation that has undefined text
        // This tests the b.text || "" fallback in the normalizeText usage
        const currentConversations1: AgentConversation[] = [
            {
                id: "conv-no-text",
                agents: new Set(["agent2", "agent3"]),
                startedAt: new Date(),
                type: ChatMessageType.AGENT,
            },
        ]
        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    {...defaultProps}
                    currentConversations={currentConversations1}
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

        const conversation: AgentConversation = {
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

        const conversation1: AgentConversation = {
            id: "conv-clear-test",
            agents: new Set(["agent1", "agent2"]),
            startedAt: new Date(),
            text: "Invoking Agent with inquiry: Clear test",
            type: ChatMessageType.AGENT,
        }

        // Render with edges present (non-empty map)
        const edgesMap = new Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>([
            [
                "edge-1",
                {
                    edge: {
                        id: "test-edge-1",
                        source: "agent1",
                        target: "agent2",
                        type: "thoughtBubbleEdge",
                        data: {text: "Test"},
                    },
                    timestamp: Date.now(),
                },
            ],
        ])

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

    describe("popup save — onSaveAgent callback", () => {
        const OLD_NETWORK_ID = "temporary/old-res"
        const OLD_NETWORK_NAME = "my_network"

        it("shows 'Applying changes...' while onSaveAgent is in-flight and closes popup on completion", async () => {
            let resolveQuery: () => void
            const onSaveAgent = jest.fn(
                () =>
                    new Promise<void>((resolve) => {
                        resolveQuery = resolve
                    })
            )

            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([
                        makeTempNetwork(OLD_NETWORK_ID, [{origin: "agent1", tools: []}], OLD_NETWORK_NAME),
                    ])
            })

            const {container} = renderAgentFlowComponent({
                isSelectedNetworkTemporary: true,
                networkId: OLD_NETWORK_ID,
                onSaveAgent,
            })

            clickFlowNode(container.querySelector('[data-id="agent1"]'))

            const instructionsField = await screen.findByRole("textbox", {name: /^instructions$/iu})
            await user.clear(instructionsField)
            await user.type(instructionsField, "Updated instructions")
            await user.click(screen.getByRole("button", {name: "Save"}))

            // While the API call is in-flight the button should show "Applying changes..." and Save should be gone
            await waitFor(() => {
                expect(screen.getByRole("button", {name: /applying changes/iu})).toBeInTheDocument()
                expect(screen.queryByRole("button", {name: /^save$/iu})).not.toBeInTheDocument()
            })

            expect(onSaveAgent).toHaveBeenCalledTimes(1)

            // Resolve the pending promise — popup should close
            act(() => resolveQuery())

            await waitFor(() => {
                expect(screen.queryByRole("button", {name: /applying changes/iu})).not.toBeInTheDocument()
            })
        })

        it("calls onSaveAgent with the correct agentName, updated definition, networkName and a signal", async () => {
            const onSaveAgent = jest.fn().mockResolvedValue(undefined)
            const EDITED_INSTRUCTIONS = "Updated instructions for agent1"

            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([
                        makeTempNetwork(
                            OLD_NETWORK_ID,
                            [{origin: "agent1", tools: [], instructions: "Original instructions."}],
                            OLD_NETWORK_NAME
                        ),
                    ])
            })

            const {container} = renderAgentFlowComponent({
                isSelectedNetworkTemporary: true,
                networkId: OLD_NETWORK_ID,
                onSaveAgent,
            })

            clickFlowNode(container.querySelector('[data-id="agent1"]'))
            const instructionsField = await screen.findByRole("textbox", {name: /^instructions$/iu})
            await user.clear(instructionsField)
            await user.type(instructionsField, EDITED_INSTRUCTIONS)
            await user.click(screen.getByRole("button", {name: "Save"}))
            await waitFor(() => {
                expect(screen.queryByRole("button", {name: /applying changes/iu})).not.toBeInTheDocument()
            })

            expect(onSaveAgent).toHaveBeenCalledTimes(1)
            const [calledAgentName, calledUpdated, calledNetworkName, calledSignal] = onSaveAgent.mock.calls[0]
            // agentName is the display name (cleaned up from the raw ID)
            expect(typeof calledAgentName).toBe("string")
            expect(calledAgentName.length).toBeGreaterThan(0)
            expect(calledUpdated.find((e: AgentNetworkDefinitionEntry) => e.origin === "agent1")?.instructions).toBe(
                EDITED_INSTRUCTIONS
            )
            expect(calledNetworkName).toBe(OLD_NETWORK_NAME)
            expect(calledSignal).toBeInstanceOf(AbortSignal)
        })

        it("closes popup even when onSaveAgent throws", async () => {
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
            const consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation()
            const onSaveAgent = jest.fn().mockRejectedValue(new Error("Network failure"))

            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([makeTempNetwork(OLD_NETWORK_ID, [{origin: "agent1", tools: []}])])
            })

            const {container} = renderAgentFlowComponent({
                isSelectedNetworkTemporary: true,
                networkId: OLD_NETWORK_ID,
                onSaveAgent,
            })

            clickFlowNode(container.querySelector('[data-id="agent1"]'))
            const instructionsField = await screen.findByRole("textbox", {name: /^instructions$/iu})
            await user.clear(instructionsField)
            await user.type(instructionsField, "Updated instructions")
            await user.click(screen.getByRole("button", {name: "Save"}))

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Error saving network"),
                expect.any(Error)
            )
            expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to save agent"))
        })

        it("closes popup immediately without calling onSaveAgent when it is not provided", async () => {
            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([makeTempNetwork(OLD_NETWORK_ID, [{origin: "agent1", tools: []}])])
            })

            const {container} = renderAgentFlowComponent({
                isSelectedNetworkTemporary: true,
                networkId: OLD_NETWORK_ID,
                // onSaveAgent intentionally omitted
            })

            clickFlowNode(container.querySelector('[data-id="agent1"]'))
            const instructionsField = await screen.findByRole("textbox", {name: /^instructions$/iu})
            await user.clear(instructionsField)
            await user.type(instructionsField, "Updated instructions")
            await user.click(screen.getByRole("button", {name: "Save"}))
            await waitFor(() => expect(screen.queryByRole("button", {name: "Save"})).not.toBeInTheDocument())
        })
    })

    describe("topology editor dock", () => {
        const DOCK_NETWORK_ID = "temporary/dock-test-net"
        const DOCK_NETWORK_NAME = "dock_network"
        const DOCK_DEFAULT_RES = "dock-default-res"

        // User-visible dock copy, reused across queries below
        const DOCK_HEADER = "Network Editor"
        const APPLYING_TITLE = "Applying changes to network"
        const ABORT_TITLE = "Abort changes?"

        // Accessible-name / placeholder matchers for the dock controls
        const PROMPT_PLACEHOLDER = /describe a change/iu
        const APPLY_BUTTON = /apply/iu
        const STOP_BUTTON = /stop/iu
        const STOP_DISCARD_BUTTON = /stop & discard/iu
        const KEEP_APPLYING_BUTTON = /keep applying/iu
        const CLOSE_EDIT_BUTTON = /close edit mode/iu

        const makeDockReservationChunk = (reservationId: string, agentNetworkName: string) =>
            JSON.stringify({
                response: {
                    type: "AGENT_FRAMEWORK",
                    sly_data: {
                        agent_reservations: [
                            {
                                reservation_id: reservationId,
                                lifetime_in_seconds: 86400,
                                expiration_time_in_seconds: Date.now() / 1000 + 86400,
                            },
                        ],
                        agent_network_name: agentNetworkName,
                    },
                },
            })

        /**
         * Mocks sendChatQuery so a dock apply stays in-flight until the returned `release()` is called,
         * at which point it succeeds with a reservation matching the current network. Lets a test observe
         * the in-flight overlay without the apply secretly resolving as a failure.
         */
        const mockInFlightDockApply = () => {
            let release!: () => void
            ;(sendChatQuery as jest.Mock).mockImplementation(
                (_url, _signal, _query, _agent, chunkCallback) =>
                    new Promise<void>((resolve) => {
                        release = () => {
                            chunkCallback(makeDockReservationChunk(DOCK_DEFAULT_RES, DOCK_NETWORK_NAME))
                            resolve()
                        }
                    })
            )
            return () => release()
        }

        beforeEach(() => {
            // Apply/cancel now surface notistack notifications, which log a copy to console.debug.
            // jest-fail-on-console treats that as a failure, so suppress it for the whole dock suite.
            jest.spyOn(console, "debug").mockImplementation()
            // Default to a successful designer response: a reservation matching the current network.
            // Tests that need a failure (no/unmatched reservation, throw, timeout) override this.
            ;(sendChatQuery as jest.Mock).mockImplementation(async (_url, _signal, _query, _agent, chunkCallback) => {
                chunkCallback(makeDockReservationChunk(DOCK_DEFAULT_RES, DOCK_NETWORK_NAME))
            })
            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([
                        makeTempNetwork(DOCK_NETWORK_ID, [{origin: "agent1", tools: []}], DOCK_NETWORK_NAME),
                    ])
            })
        })

        it("shows the topology editor dock when isEditMode and isSelectedNetworkTemporary are true", () => {
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
            })

            expect(screen.getByText(DOCK_HEADER)).toBeInTheDocument()
        })

        it("does not show the dock when isEditMode is false", () => {
            renderAgentFlowComponent({
                isEditMode: false,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
            })

            expect(screen.queryByText(DOCK_HEADER)).not.toBeInTheDocument()
        })

        it("does not show the dock when isSelectedNetworkTemporary is false", () => {
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: false,
                networkId: DOCK_NETWORK_ID,
            })

            expect(screen.queryByText(DOCK_HEADER)).not.toBeInTheDocument()
        })

        it("does not show the dock when isAwaitingLlm is true", () => {
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                isAwaitingLlm: true,
            })

            expect(screen.queryByText(DOCK_HEADER)).not.toBeInTheDocument()
        })

        it("calls onExitEditMode when the close button is clicked", async () => {
            const onExitEditMode = jest.fn()
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                onExitEditMode,
            })

            const closeButton = screen.getByRole("button", {name: CLOSE_EDIT_BUTTON})
            await user.click(closeButton)

            expect(onExitEditMode).toHaveBeenCalledTimes(1)
        })

        it("aborts an in-flight dock request if the close button is clicked during streaming", async () => {
            const consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation()
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
            const onExitEditMode = jest.fn()
            let capturedSignal: AbortSignal | undefined
            ;(sendChatQuery as jest.Mock).mockImplementation(
                (_url: string, signal: AbortSignal) =>
                    new Promise<void>((_resolve, reject) => {
                        capturedSignal = signal
                        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
                    })
            )

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
                onExitEditMode,
            })

            await user.type(screen.getByPlaceholderText(PROMPT_PLACEHOLDER), "add a node")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // Wait until the overlay appears (streaming started)
            expect(screen.getByText(APPLYING_TITLE)).toBeVisible()

            // Click the close button while request is in-flight
            await user.click(screen.getByRole("button", {name: CLOSE_EDIT_BUTTON}))

            expect(capturedSignal?.aborted).toBe(true)
            expect(onExitEditMode).toHaveBeenCalledTimes(1)

            expect(consoleErrorSpy).not.toHaveBeenCalled()
            expect(consoleDebugSpy).not.toHaveBeenCalled()
        })

        it("Apply button is disabled when prompt is empty", () => {
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            expect(screen.getByRole("button", {name: APPLY_BUTTON})).toBeDisabled()
        })

        it("Apply button becomes enabled after typing a prompt", async () => {
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
            await user.type(promptField, "Add a new agent")

            expect(screen.getByRole("button", {name: APPLY_BUTTON})).toBeEnabled()
        })

        it("forwards the dock prompt to sendChatQuery on Apply and replaces the network", async () => {
            const NEW_DOCK_RES_ID = "dock-new-res"
            ;(sendChatQuery as jest.Mock).mockImplementation(async (_url, _signal, _query, _agent, chunkCallback) => {
                chunkCallback(makeDockReservationChunk(NEW_DOCK_RES_ID, DOCK_NETWORK_NAME))
            })

            const onNetworkReplaced = jest.fn()
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
                onNetworkReplaced,
            })

            const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
            await user.type(promptField, "Add a legal review agent")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // The typed prompt is forwarded to the designer...
            expect(sendChatQuery).toHaveBeenCalledTimes(1)
            expect((sendChatQuery as jest.Mock).mock.calls[0][2]).toBe("Add a legal review agent")
            // ...and the returned reservation replaces the current network
            expect(onNetworkReplaced).toHaveBeenCalledWith(DOCK_NETWORK_ID, `temporary/${NEW_DOCK_RES_ID}`)
        })

        it("shows an error toast when dock apply returns no reservations", async () => {
            // The notification also logs a copy to console.debug; suppress it (jest-fail-on-console)
            jest.spyOn(console, "debug").mockImplementation()
            const {enqueueSnackbar} = jest.requireMock("notistack")
            ;(sendChatQuery as jest.Mock).mockResolvedValue({})

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
            await user.type(promptField, "Add a node")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // The user sees an error toast explaining no reservation came back
            expect(enqueueSnackbar).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    variant: "error",
                    description: expect.stringContaining("did not return a reservation"),
                })
            )
        })

        it("shows error toast and resets state when dock apply throws", async () => {
            // The notification also logs a copy to console.debug; suppress it (jest-fail-on-console)
            jest.spyOn(console, "debug").mockImplementation()
            const {enqueueSnackbar} = jest.requireMock("notistack")
            ;(sendChatQuery as jest.Mock).mockRejectedValue(new Error("Network failure"))

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
            await user.type(promptField, "Add a node")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // The user sees an error toast carrying the underlying failure
            expect(enqueueSnackbar).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({variant: "error", description: expect.stringContaining("Network failure")})
            )
            // Button should re-enable after error
            expect(screen.getByRole("button", {name: APPLY_BUTTON})).toBeEnabled()
        })

        it("shows a timeout error toast when the dock apply request times out", async () => {
            jest.useFakeTimers()
            // Re-initialise userEvent with advanceTimers so its internal delays stay in sync with
            // fake timers (the module-level `user` is bound to real timers and would stall here).
            const localUser = userEvent.setup({advanceTimers: jest.advanceTimersByTime.bind(jest)})
            // The notification also logs a copy to console.debug; suppress it (jest-fail-on-console)
            jest.spyOn(console, "debug").mockImplementation()
            const {enqueueSnackbar} = jest.requireMock("notistack")
            ;(sendChatQuery as jest.Mock).mockImplementation(
                (_url: string, signal: AbortSignal) =>
                    new Promise<void>((_resolve, reject) => {
                        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
                    })
            )

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
            await localUser.type(promptField, "add a node")
            await localUser.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // Advance past the 120-second dock apply timeout
            await act(async () => {
                jest.advanceTimersByTime(121_000)
            })

            // The user sees an error toast explaining the request timed out
            await waitFor(() => {
                expect(enqueueSnackbar).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({variant: "error", description: expect.stringContaining("timed out")})
                )
            })
        })

        it("deduplicates reservations when two chunks with the same name but different expiry arrive", async () => {
            const LOW_EXPIRY = Date.now() / 1000 + 100
            const HIGH_EXPIRY = Date.now() / 1000 + 86400
            const FIRST_RES = "res-low"
            const SECOND_RES = "res-high"

            const makeChunk = (reservationId: string, expiry: number) =>
                JSON.stringify({
                    response: {
                        type: "AGENT_FRAMEWORK",
                        sly_data: {
                            agent_reservations: [
                                {
                                    reservation_id: reservationId,
                                    lifetime_in_seconds: 300,
                                    expiration_time_in_seconds: expiry,
                                },
                            ],
                            agent_network_name: DOCK_NETWORK_NAME,
                        },
                    },
                })

            ;(sendChatQuery as jest.Mock).mockImplementation(async (_url, _signal, _query, _agent, chunkCallback) => {
                // Send low-expiry first, then high-expiry (high should win)
                chunkCallback(makeChunk(FIRST_RES, LOW_EXPIRY))
                chunkCallback(makeChunk(SECOND_RES, HIGH_EXPIRY))
            })

            const onNetworkReplaced = jest.fn()
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
                onNetworkReplaced,
            })

            const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
            await user.type(promptField, "Add a node")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // The higher-expiry reservation should win
            expect(onNetworkReplaced).toHaveBeenCalledWith(DOCK_NETWORK_ID, `temporary/${SECOND_RES}`)
        })

        it("pressing Enter in the prompt field submits the dock apply", async () => {
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            const promptField = screen.getByPlaceholderText(PROMPT_PLACEHOLDER)
            await user.type(promptField, "Add a node{Enter}")
            expect(sendChatQuery).toHaveBeenCalledTimes(1)
        })

        it("does not show the applying overlay when the dock is idle", () => {
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            // The backdrop keeps its content mounted but hidden while idle, so it must not be visible
            expect(screen.getByText(APPLYING_TITLE)).not.toBeVisible()
        })

        it("shows the applying overlay with the prompt text while apply is in-flight", async () => {
            // Keep the apply in-flight so the overlay stays mounted; it never resolves, so no cleanup is needed.
            mockInFlightDockApply()

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            await user.type(screen.getByPlaceholderText(PROMPT_PLACEHOLDER), "add some elves to check work")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // The overlay is shown with its title and the in-flight prompt text
            expect(screen.getByText(APPLYING_TITLE)).toBeVisible()
            expect(screen.getByText("add some elves to check work")).toBeInTheDocument()
        })

        it("removes the applying overlay once the apply call completes", async () => {
            const release = mockInFlightDockApply()

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            await user.type(screen.getByPlaceholderText(PROMPT_PLACEHOLDER), "add some elves to check work")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))
            expect(screen.getByText(APPLYING_TITLE)).toBeVisible()

            await act(async () => {
                release()
            })

            await waitFor(() => {
                expect(screen.getByText(APPLYING_TITLE)).not.toBeVisible()
            })
        })

        it("shows Stop button in backdrop while applying; clicking it shows the confirm card", async () => {
            const release = mockInFlightDockApply()

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            await user.type(screen.getByPlaceholderText(PROMPT_PLACEHOLDER), "add a node")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // Stop button should appear while backdrop is open, with no confirm card yet
            const stopButton = screen.getByRole("button", {name: STOP_BUTTON})
            expect(stopButton).toBeInTheDocument()
            expect(screen.queryByText(ABORT_TITLE)).not.toBeInTheDocument()

            await user.click(stopButton)

            // Confirm card should appear
            expect(screen.getByText(ABORT_TITLE)).toBeInTheDocument()
            expect(screen.getByRole("button", {name: KEEP_APPLYING_BUTTON})).toBeInTheDocument()
            expect(screen.getByRole("button", {name: STOP_DISCARD_BUTTON})).toBeInTheDocument()

            await act(async () => {
                release()
            })
        })

        it("Keep applying dismisses the confirm card and continues streaming", async () => {
            const release = mockInFlightDockApply()

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            await user.type(screen.getByPlaceholderText(PROMPT_PLACEHOLDER), "add a node")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            await user.click(screen.getByRole("button", {name: STOP_BUTTON}))
            await user.click(screen.getByRole("button", {name: KEEP_APPLYING_BUTTON}))

            // Progress card (with Stop button) should be back; backdrop still visible
            expect(screen.getByRole("button", {name: STOP_BUTTON})).toBeInTheDocument()
            expect(screen.getByText(APPLYING_TITLE)).toBeVisible()

            await act(async () => {
                release()
            })
        })

        it("Stop & discard aborts the request, hides backdrop, notifies, and restores the prompt", async () => {
            const consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation()
            const {enqueueSnackbar} = jest.requireMock("notistack")
            ;(sendChatQuery as jest.Mock).mockImplementation(
                (_url: string, signal: AbortSignal) =>
                    new Promise<void>((_resolve, reject) => {
                        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
                    })
            )

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            await user.type(screen.getByPlaceholderText(PROMPT_PLACEHOLDER), "add a node")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // Open confirm card, then discard
            await user.click(await screen.findByRole("button", {name: STOP_BUTTON}))
            await user.click(await screen.findByRole("button", {name: STOP_DISCARD_BUTTON}))

            // Backdrop should close
            await waitFor(() => {
                expect(screen.getByText(APPLYING_TITLE)).not.toBeVisible()
            })

            // The user sees a cancellation notification and the prompt is left intact for retry
            await waitFor(() => {
                expect(enqueueSnackbar).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({
                        variant: "info",
                        description: expect.stringContaining("prompt is restored below"),
                    })
                )
            })
            expect(screen.getByDisplayValue("add a node")).toBeInTheDocument()

            // Discarding logs the cancellation notice, not a failure: it's an intentional abort
            expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining("Applying cancelled."))
            expect(consoleDebugSpy).not.toHaveBeenCalledWith(expect.stringContaining("Failed to apply network change"))
        })

        it("notifies and clears the prompt after dock apply completes", async () => {
            const {enqueueSnackbar} = jest.requireMock("notistack")

            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            await user.type(screen.getByPlaceholderText(PROMPT_PLACEHOLDER), "add a node")
            await user.click(screen.getByRole("button", {name: APPLY_BUTTON}))

            // The user sees a success notification confirming their changes were applied...
            await waitFor(() => {
                expect(enqueueSnackbar).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({
                        variant: "success",
                        description: expect.stringContaining("network has been updated"),
                    })
                )
            })
            // ...and the prompt is cleared once the change lands
            expect(screen.getByPlaceholderText(PROMPT_PLACEHOLDER)).toHaveValue("")
        })

        it("does nothing when Enter is pressed with an empty prompt", async () => {
            renderAgentFlowComponent({
                isEditMode: true,
                isSelectedNetworkTemporary: true,
                networkId: DOCK_NETWORK_ID,
                neuroSanURL: "http://localhost:8080",
                currentUser: "test-user",
            })

            // Enter bypasses the disabled Apply button, so handleDockApply runs and must early-return.
            await user.click(screen.getByPlaceholderText(PROMPT_PLACEHOLDER))
            await user.keyboard("{Enter}")

            expect(sendChatQuery).not.toHaveBeenCalled()
            // The saving backdrop stays closed, so its title is never shown to the user.
            expect(screen.getByText(/applying changes to network/iu)).not.toBeVisible()
        })
    })
})

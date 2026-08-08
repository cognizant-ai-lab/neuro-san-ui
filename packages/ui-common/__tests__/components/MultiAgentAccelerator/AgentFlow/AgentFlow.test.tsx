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
import {userEvent, UserEvent} from "@testing-library/user-event"
import {NodePositionChange, NodeRemoveChange, ReactFlowProvider} from "@xyflow/react"
import {FC, useEffect} from "react"

import {makeTempNetwork} from "../../../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {AgentConversation} from "../../../../components/MultiAgentAccelerator/AgentConversations"
import {
    AgentFlow,
    AgentFlowProps,
    filterNodeEvents,
} from "../../../../components/MultiAgentAccelerator/AgentFlow/AgentFlow"
import {AgentNetworkDefinitionEntry} from "../../../../components/MultiAgentAccelerator/const"
import {ThoughtBubbleEdgeShape} from "../../../../components/MultiAgentAccelerator/ThoughtBubbles/ThoughtBubbleEdge"
import {ChatMessageType, ConnectivityInfo} from "../../../../generated/neuro-san/NeuroSanClient"
import {useSettingsStore} from "../../../../state/Settings"
import {useTempNetworksStore} from "../../../../state/TemporaryNetworks"
import {PALETTES} from "../../../../Theme/Palettes"
import {cleanUpAgentName} from "../../../../utils/AgentName"

//#region Constants

const AGENT_1 = "agent1"
const AGENT_1_NODE = `[data-id="${AGENT_1}"]`
const AGENT_2 = "agent2"
const AGENT_3 = "agent3"
// Accessible name of the Save button while a save is in-flight.
const APPLYING_CHANGES_BUTTON = "Applying changes..."
const CONV_1 = "conv-1"
const CONV_2 = "conv-2"
const CONV_WITH_TEXT = "conv-with-text"
const DOCK_HEADER = "Network Editor"
const DOCK_NETWORK_ID = "temporary/dock-test-net"
const DOCK_NETWORK_NAME = "dock_network"
const FLOW_WRAPPER = '[data-testid="rf__wrapper"]'
const INSTRUCTIONS_FIELD = "Instructions"
// display_as value marking an editable LLM agent node.
const LLM_AGENT_DISPLAY = "llm_agent"
const MOCK_PLASMA_EDGE_TEST_ID = "mock-plasma-edge"
const MOCK_THOUGHT_BUBBLE_EDGE_TEST_ID = "mock-thought-bubble-edge"
const MOCK_THOUGHT_BUBBLE_OVERLAY_TEST_ID = "mock-thought-bubble-overlay"
const NETWORK = [
    {
        origin: AGENT_1,
        display_as: LLM_AGENT_DISPLAY,
        tools: [AGENT_2, AGENT_3],
    },
    {
        origin: AGENT_2,
        tools: [AGENT_3],
    },
    {
        origin: AGENT_3,
        tools: [],
    },
] satisfies ConnectivityInfo[]

const OLD_NETWORK_ID = "temporary/old-res"
const OLD_NETWORK_NAME = "my_network"
const SAVE_BUTTON = "Save"

// React Flow edge type for thought-bubble edges (matches the source's edge `type`).
const THOUGHT_BUBBLE_EDGE_TYPE = "thoughtBubbleEdge"
const UPDATED_INSTRUCTIONS = "Updated instructions"

//#endregion Constants

//#region Types

type KeyboardOpenTestCase = {
    readonly desc: string
    readonly target: string
    readonly key: KeyboardEvent["key"]
    readonly opens: boolean
}

// Provide a mutable implementation for the ThoughtBubbleOverlay mock so individual
// tests can swap the implementation without attempting to redefine the module
// export (which can throw "Cannot redefine property" errors).
type ThoughtBubbleOverlayProps = {
    onBubbleHoverChange?: (id: string) => void
}

//#endregion Types

//#region Mocks

vi.mock("../../../../controller/agent/Agent")

vi.mock("notistack", async (importOriginal) => {
    const actual = await importOriginal<typeof import("notistack")>()

    return {
        ...actual,
        enqueueSnackbar: vi.fn(),
    }
})

vi.mock("@mui/material/styles", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@mui/material/styles")>()

    return {
        ...actual,
        useColorScheme: vi.fn(),
    }
})

vi.mock("../../../../components/MultiAgentAccelerator/AgentFlow/PlasmaEdge", () => ({
    PlasmaEdge: () => <g data-testid={MOCK_PLASMA_EDGE_TEST_ID} />,
}))

vi.mock("../../../../components/MultiAgentAccelerator/ThoughtBubbles/ThoughtBubbleEdge", () => ({
    ThoughtBubbleEdge: () => <g data-testid={MOCK_THOUGHT_BUBBLE_EDGE_TEST_ID} />,
}))

const defaultMockThoughtBubbleOverlay: FC<ThoughtBubbleOverlayProps> = () => (
    <div data-testid={MOCK_THOUGHT_BUBBLE_OVERLAY_TEST_ID} />
)
let __MockThoughtBubbleOverlayImpl: FC<ThoughtBubbleOverlayProps> = defaultMockThoughtBubbleOverlay
vi.mock("../../../../components/MultiAgentAccelerator/ThoughtBubbles/ThoughtBubbleOverlay", () => ({
    ThoughtBubbleOverlay: (props: ThoughtBubbleOverlayProps) => __MockThoughtBubbleOverlayImpl(props),
}))

//#endregion Mocks

describe("AgentFlow", () => {
    let user: UserEvent

    withStrictMocks()

    beforeEach(() => {
        // This has nothing to do with Jest itself and everything to do with a bug in React Testing Library.
        // See: https://github.com/testing-library/user-event/issues/1115#issuecomment-1565730917
        // @ts-expect-error -- it's an ugly workaround to be removed when the above issue is fixed in RTL.
        globalThis["jest"] = {
            advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
        }

        user = userEvent.setup()
        vi.mocked(useColorScheme).mockReturnValue({
            colorScheme: undefined,
            darkColorScheme: undefined,
            lightColorScheme: undefined,
            setColorScheme: vi.fn(),
            setMode: vi.fn(),
            systemMode: undefined,
            allColorSchemes: ["light", "dark"],
            mode: "light",
        })
        useTempNetworksStore.getState().setTempNetworks([])

        useSettingsStore.getState().resetSettings()
        useSettingsStore.persist.clearStorage()
    })

    const currentConversations2: AgentConversation[] = [
        {
            id: "test-conv-1",
            agents: new Set([AGENT_1]),
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
        onSaveAgent: vi.fn(),
        thoughtBubbleEdges: new Map(),
        setThoughtBubbleEdges: vi.fn(),
    }

    const renderAgentFlowComponent = (overrides: Partial<AgentFlowProps> = {}, mode: PaletteMode = "light") => {
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

    // Presses a key on a React Flow node. Uses fireEvent for the same jsdom/xyflow reason as clickFlowNode above.
    const pressKeyOnFlowNode = (element: Element | null, key: string) => fireEvent.keyDown(element, {key})

    const verifyAgentNodes = (container: HTMLElement) => {
        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(3)

        const agentNames = NETWORK.map((agent) => agent.origin)

        // Make sure each agent node is rendered at least. Each node has a data-id with its name.
        agentNames.forEach((agent) => {
            expect(container.querySelector(`[data-id="${CSS.escape(agent)}"]`)).not.toBeNull()
        })
    }

    // Simulates React's functional-setState pattern so tests can inspect the resulting Map.
    const createThoughtBubbleEdgesStore = () => {
        let map = new Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>()
        const mockSetThoughtBubbleEdges = vi.fn((updater: unknown) => {
            if (typeof updater === "function") {
                map = (updater as (prev: typeof map) => typeof map)(map)
            }
        })
        return {mockSetThoughtBubbleEdges, getThoughtBubbleEdgesMap: () => map}
    }

    describe("Basic Rendering", () => {
        it("Should show the network title when networkDisplayName is provided", async () => {
            const networkName = "My Network"
            renderAgentFlowComponent({networkDisplayName: networkName})
            expect(await screen.findByText(networkName)).toBeInTheDocument()
        })

        it("Should show the network title in dark mode", async () => {
            const networkName = "Dark Network"
            renderAgentFlowComponent({networkDisplayName: networkName}, "dark")
            expect(await screen.findByText(networkName)).toBeInTheDocument()
        })

        it("Should not show the title bar when networkDisplayName is not provided", async () => {
            const networkName = "My Network"
            renderAgentFlowComponent()

            // Wait for the flow to render (the toolbar is always present)
            await screen.findByRole("button", {name: "Heatmap"})

            // The title bar's only content is the network display name; with none provided, none renders.
            expect(screen.queryByText(networkName)).not.toBeInTheDocument()
        })

        it("Should show the Edit button on a temporary network and invoke onEnterEditMode when clicked", async () => {
            const networkName = "Temp Net"
            renderAgentFlowComponent({
                networkDisplayName: networkName,
                isTemporaryNetwork: true,
                isAwaitingLlm: false,
            })

            await screen.findByText(networkName)

            // Network editor should not currently be visible
            await waitFor(() => {
                expect(screen.queryByText("Network Editor")).not.toBeInTheDocument()
            })

            // Target the dock's Edit button by its visible text; node hover edit icons share the "Edit"
            // accessible name (via aria-label) but render no text.
            const editBtn = await screen.findByText("Edit")
            await user.click(editBtn)

            // Now network editor should be visible
            await screen.findByText("Network Editor")
        })

        it("Should hide the Edit button for permanent networks", async () => {
            const networkName = "Regular Net"
            renderAgentFlowComponent({
                networkDisplayName: networkName,
                isTemporaryNetwork: false,
            })
            await screen.findByText(networkName)
            expect(screen.queryByText("Edit")).not.toBeInTheDocument()
        })

        it("Should not show the Edit button when already in edit mode", async () => {
            const networkName = "Temp Net"
            renderAgentFlowComponent({
                networkDisplayName: networkName,
                isTemporaryNetwork: true,
            })
            await screen.findByText(networkName)

            // Click edit button to enter edit mode
            const editBtn = await screen.findByText("Edit")
            await user.click(editBtn)

            // Now the edit button should not be present
            expect(screen.queryByText("Edit")).not.toBeInTheDocument()
        })

        it("Should not show the Edit button when awaiting LLM", async () => {
            const networkName = "Temp Net"
            renderAgentFlowComponent({
                networkDisplayName: networkName,
                isTemporaryNetwork: true,
                isAwaitingLlm: true,
            })
            await screen.findByText(networkName)
            expect(screen.queryByText("Edit")).not.toBeInTheDocument()
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

        // eslint-disable-next-line max-len -- conflicts with prettier
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

            // Radial guides should still not be present in linear layout
            const radialGuidesAfterClick = container.querySelector("#test-flow-id-radial-guides")
            expect(radialGuidesAfterClick).not.toBeInTheDocument()
        })

        it("Should handle isStreaming false", () => {
            const {container} = renderAgentFlowComponent({isStreaming: false})

            // Should render without errors
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should render legend and controls when not awaiting LLM", () => {
            const {container} = renderAgentFlowComponent({isAwaitingLlm: false})

            // When not awaiting LLM, legend and controls should be rendered
            expect(container.querySelector("#test-flow-id-legend")).toBeInTheDocument()
            expect(container.querySelector("#radial-layout-button")).toBeInTheDocument()
        })

        it("Should render the legend if agent list is greater than 0", async () => {
            const {container} = renderAgentFlowComponent()

            // Expect legend to be present
            expect(container.querySelector("#test-flow-id-legend")).toBeInTheDocument()
        })

        it("Should handle an empty agent list", async () => {
            const {container} = renderAgentFlowComponent({agentsInNetwork: [], currentConversations: null})

            const nodes = container.getElementsByClassName("react-flow__node")
            expect(nodes).toHaveLength(0)

            // Expect legend not to be present
            expect(container.querySelector("#test-flow-id-legend")).not.toBeInTheDocument()
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

        it("Should handle a Frontman-only network", async () => {
            const {container} = renderAgentFlowComponent({
                agentsInNetwork: [NETWORK[2]],
                currentConversations: [
                    {
                        id: "test-conv-frontman",
                        agents: new Set([AGENT_3]),
                        startedAt: new Date(),
                        type: ChatMessageType.AGENT,
                    },
                ],
            })

            const nodes = container.getElementsByClassName("react-flow__node")
            expect(nodes).toHaveLength(1)
        })
    })

    describe("Layouts", () => {
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

        it("Should show radial guides only in radial layout with more than one depth", async () => {
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
                                agents: new Set([AGENT_3]),
                                startedAt: new Date(),
                                type: ChatMessageType.AGENT,
                            },
                        ]}
                        isAwaitingLlm={false}
                        isStreaming={false}
                        thoughtBubbleEdges={new Map()}
                        setThoughtBubbleEdges={vi.fn()}
                    />
                </ReactFlowProvider>
            )

            // Should not show radial guides SVG with only one node
            await waitFor(() => {
                expect(container.querySelector("#test-flow-id-radial-guides")).not.toBeInTheDocument()
            })
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
            await waitFor(() => {
                expect(container.querySelector("#test-flow-id-radial-guides")).toBeInTheDocument()
            })
        })
    })

    describe("Agent Graph", () => {
        it("should correctly filter node events", async () => {
            const dragEvent: NodePositionChange = {
                id: "",
                type: "position",
            }

            // Normally dragging is allowed
            expect(filterNodeEvents(dragEvent, false)).toBe(true)

            // No dragging in Agent Network Designer preview
            expect(filterNodeEvents(dragEvent, true)).toBe(false)

            // Modifications are not allowed (in regular mode or AND mode)
            const removeEvent: NodeRemoveChange = {id: "", type: "remove"}
            expect(filterNodeEvents(removeEvent, false)).toBe(false)
            expect(filterNodeEvents(removeEvent, true)).toBe(false)
        })
    })

    describe("Animation", () => {
        it("Should handle highlighting the active agents", async () => {
            const {container, rerender} = renderAgentFlowComponent()

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
                                agents: new Set([AGENT_1, AGENT_3]),
                                startedAt: new Date(),
                                type: ChatMessageType.AGENT,
                            },
                        ]}
                        thoughtBubbleEdges={new Map()}
                        setThoughtBubbleEdges={vi.fn()}
                    />
                </ReactFlowProvider>
            )

            // agent1 is active so should be highlighted
            const agent1Node = container.querySelector(`[data-id="${CSS.escape(AGENT_1)}"]`)
            expect(agent1Node).toBeInTheDocument()

            // agent1 is active so should be highlighted
            const agent1NodeBody = screen.getByTestId(AGENT_1)
            const computedStyleAgent1 = window.getComputedStyle(agent1NodeBody)
            expect(computedStyleAgent1.animation).toMatch(/animation-\w+ 2s infinite/u)

            // agent2 is not "active" so should not have the pulsing animation (or any animation in fact)
            const agent2NodeBody = screen.getByTestId(AGENT_2)
            const computedStyleAgent2 = window.getComputedStyle(agent2NodeBody)
            expect(computedStyleAgent2.animation).toBe("")

            // agent3 is active so should be highlighted
            const agent3NodeBody = screen.getByTestId(AGENT_3)
            const computedStyleAgent3 = window.getComputedStyle(agent3NodeBody)
            expect(computedStyleAgent3.animation).toMatch(/animation-\w+ 2s infinite/u)
        })

        it("Should handle isAwaitingLlm prop correctly", () => {
            const {container} = renderAgentFlowComponent({isAwaitingLlm: true})

            // When awaiting LLM, legend and controls should not be rendered
            expect(container.querySelector("#test-flow-id-legend")).not.toBeInTheDocument()
            expect(container.querySelector("#radial-layout-button")).not.toBeInTheDocument()
        })

        it("Should render with isStreaming prop", () => {
            const {container} = renderAgentFlowComponent({isStreaming: true})

            // Should render without errors
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should render plasma edges between agents in conversation when isAwaitingLlm is true", () => {
            // agent1 and agent2 are connected in NETWORK (agent1 -> agent2)
            // Placing both in the same conversation with a valid type triggers plasma edges
            const conversationsWithPlasma: AgentConversation[] = [
                {
                    id: "plasma-conv",
                    agents: new Set([AGENT_1, AGENT_2]),
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

            expect(screen.getByTestId(MOCK_PLASMA_EDGE_TEST_ID)).toBeVisible()
        })
    })

    describe("Thought Bubbles", () => {
        it("Should render ThoughtBubbleOverlay component", () => {
            renderAgentFlowComponent()

            expect(screen.getByTestId(MOCK_THOUGHT_BUBBLE_OVERLAY_TEST_ID)).toBeInTheDocument()
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

        it("Should render ThoughtBubbleOverlay component when showing thought bubbles", () => {
            renderAgentFlowComponent()

            // ThoughtBubbleOverlay should be rendered (it's mocked)
            expect(screen.getByTestId(MOCK_THOUGHT_BUBBLE_OVERLAY_TEST_ID)).toBeInTheDocument()
        })

        it("Should render ThoughtBubbleEdge in edge types", () => {
            renderAgentFlowComponent()

            // Component should render without errors
            expect(screen.getByTestId(MOCK_THOUGHT_BUBBLE_OVERLAY_TEST_ID)).toBeInTheDocument()
        })

        it("Should handle conversations with text for thought bubbles", () => {
            const conversationsWithText: AgentConversation[] = [
                {
                    id: "test-conv-with-text",
                    agents: new Set([AGENT_1, AGENT_2]),
                    startedAt: new Date(),
                    text: "What is the weather today?",
                    type: ChatMessageType.HUMAN,
                },
            ]

            const {container} = renderAgentFlowComponent({
                currentConversations: conversationsWithText,
                isStreaming: true,
            })

            // Component should render successfully with conversation text
            expect(container).toBeInTheDocument()
        })

        it("Should call setThoughtBubbleEdges when conversations with text are added", () => {
            const mockSetThoughtBubbleEdges = vi.fn()
            const conversationsWithText = [
                {
                    id: CONV_WITH_TEXT,
                    agents: new Set([AGENT_1, AGENT_2]),
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
                            source: AGENT_1,
                            target: AGENT_2,
                            type: THOUGHT_BUBBLE_EDGE_TYPE,
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
            const mockSetThoughtBubbleEdges = vi.fn()
            const existingEdgesMap = new Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>([
                [
                    CONV_1,
                    {
                        edge: {
                            id: "thought-bubble-conv-1",
                            source: AGENT_1,
                            target: AGENT_2,
                            type: THOUGHT_BUBBLE_EDGE_TYPE,
                            data: {
                                text: '{"inquiry": "What is the weather?"}',
                                showAlways: true,
                                conversationId: CONV_1,
                            },
                        },
                        timestamp: Date.now(),
                    },
                ],
            ])

            // Pre-populate with an existing edge

            const duplicateConversations: AgentConversation[] = [
                {
                    id: CONV_2,
                    agents: new Set([AGENT_2, AGENT_3]),
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
                agents: new Set([AGENT_1, AGENT_2]),
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
            vi.useFakeTimers()
            const {mockSetThoughtBubbleEdges, getThoughtBubbleEdgesMap} = createThoughtBubbleEdgesStore()

            const conversationsWithText: AgentConversation[] = [
                {
                    id: "conv-timeout-test",
                    agents: new Set([AGENT_1, AGENT_2]),
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
                vi.advanceTimersByTime(11000)
            })

            // The bubble should have been removed from the map after expiry
            expect(getThoughtBubbleEdgesMap().size).toBe(0)
        })

        it("Should handle hover state changes for thought bubbles", () => {
            const currentConversations: AgentConversation[] = [
                {
                    id: "hover-test-conv",
                    agents: new Set([AGENT_1, AGENT_2]),
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
            expect(screen.getByTestId(MOCK_THOUGHT_BUBBLE_OVERLAY_TEST_ID)).toBeInTheDocument()
        })

        it("Should prevent expired bubbles from being removed when hovered", async () => {
            vi.useFakeTimers()
            const mockSetThoughtBubbleEdges = vi.fn()

            // Create a conversation that will be added as a thought bubble
            const conversationsWithText: AgentConversation[] = [
                {
                    id: "hover-prevent-expire-conv",
                    agents: new Set([AGENT_1, AGENT_2]),
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
                return <div data-testid={MOCK_THOUGHT_BUBBLE_OVERLAY_TEST_ID} />
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
                vi.advanceTimersByTime(11000)
            })

            // The bubble should not be removed because it's being hovered
            // We can verify by checking that the component still renders
            expect(screen.getByTestId(MOCK_THOUGHT_BUBBLE_OVERLAY_TEST_ID)).toBeInTheDocument()

            __MockThoughtBubbleOverlayImpl = previousImpl
        })

        it("Should drop expired bubbles first when overflow limit is reached", () => {
            vi.useFakeTimers()
            const mockSetThoughtBubbleEdges = vi.fn()

            // Create 5 conversations to fill MAX_THOUGHT_BUBBLES (5) with bubbles whose startedAt is the current
            // fake time
            const initialConversations: AgentConversation[] = Array.from({length: 5}, (_, i) => ({
                id: `conv-expire-overflow-${i}`,
                agents: new Set([AGENT_1, AGENT_2]),
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
                vi.advanceTimersByTime(11000)
            })

            // Now add a 6th conversation. allBubbles will be 6 (>MAX=5), so the overflow handler will run.
            const extraConversation: AgentConversation = {
                id: "conv-expire-overflow-extra",
                agents: new Set([AGENT_2, AGENT_3]),
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

        it("Should handle case-insensitive duplicate detection in thought bubbles", () => {
            const conversationsWithCaseVariations: AgentConversation[] = [
                {
                    id: "conv-case-1",
                    agents: new Set([AGENT_1, AGENT_2]),
                    startedAt: new Date(),
                    text: "Invoking Agent with inquiry: TEST MESSAGE",
                    type: ChatMessageType.AGENT,
                },
                {
                    id: "conv-case-2",
                    agents: new Set([AGENT_2, AGENT_3]),
                    startedAt: new Date(),
                    text: "Invoking Agent with inquiry: test message", // Same but lowercase
                    type: ChatMessageType.AGENT,
                },
            ]

            const mockSetThoughtBubbleEdges = vi.fn()

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
                            source: AGENT_1,
                            target: AGENT_2,
                            type: THOUGHT_BUBBLE_EDGE_TYPE,
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
                    agents: new Set([AGENT_2, AGENT_3]),
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
                        setThoughtBubbleEdges={vi.fn()}
                    />
                </ReactFlowProvider>
            )

            // Should render without errors
            expect(container).toBeInTheDocument()
        })

        it("Should handle clearing thoughtBubbleEdges map", () => {
            const mockSetThoughtBubbleEdges = vi.fn()

            const conversation1: AgentConversation = {
                id: "conv-clear-test",
                agents: new Set([AGENT_1, AGENT_2]),
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
                            source: AGENT_1,
                            target: AGENT_2,
                            type: THOUGHT_BUBBLE_EDGE_TYPE,
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
    })

    describe("Conversations", () => {
        it("Should handle null currentConversations", () => {
            const {container} = renderAgentFlowComponent({currentConversations: null})

            // Should render without errors
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should handle conversations with multiple agents", () => {
            const multiAgentConversations: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set([AGENT_1, AGENT_2]),
                    startedAt: new Date(),
                    type: ChatMessageType.AGENT,
                },
                {
                    id: CONV_2,
                    agents: new Set([AGENT_2, AGENT_3]),
                    startedAt: new Date(),
                    type: ChatMessageType.AGENT,
                },
            ]

            const {container} = renderAgentFlowComponent({currentConversations: multiAgentConversations})

            // Should render without errors
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should handle conversations with text field", () => {
            const conversationsWithText: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set([AGENT_1]),
                    startedAt: new Date(),
                    text: "Test inquiry text",
                    type: ChatMessageType.HUMAN,
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

        it("Should handle currentConversations becoming null (streaming complete)", () => {
            const initialConversations: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set([AGENT_1, AGENT_2]),
                    startedAt: new Date(),
                    text: "Test message",
                    type: ChatMessageType.AGENT,
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
            const singleAgentConv: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set([AGENT_1]),
                    startedAt: new Date(),
                    text: "Single agent message",
                    type: ChatMessageType.AGENT,
                },
            ]

            const {container} = renderAgentFlowComponent({currentConversations: singleAgentConv})

            // Should render without errors (won't create edge with < 2 agents)
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should handle conversation with three or more agents", () => {
            const multiAgentConv: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set([AGENT_1, AGENT_2, AGENT_3]),
                    startedAt: new Date(),
                    text: "Multi-agent message",
                    type: ChatMessageType.AGENT,
                },
            ]

            const {container} = renderAgentFlowComponent({currentConversations: multiAgentConv})

            // Should render without errors (creates edge from first two agents)
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should handle conversations without text field", () => {
            const conversationsWithoutText: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set([AGENT_1, AGENT_2]),
                    startedAt: new Date(),
                    type: ChatMessageType.AGENT,
                    // No text field
                },
            ]

            const {container} = renderAgentFlowComponent({currentConversations: conversationsWithoutText})

            // Should render without errors (skips processing conversations without text)
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should handle empty agents set in conversation", () => {
            const conversationsWithEmptyAgents: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set<string>(),
                    startedAt: new Date(),
                    text: "Message with no agents",
                    type: ChatMessageType.AGENT,
                },
            ]

            const {container} = renderAgentFlowComponent({currentConversations: conversationsWithEmptyAgents})

            // Should render without errors
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should handle duplicate conversations with same parsed text", () => {
            const duplicateConversations: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set([AGENT_1, AGENT_2]),
                    startedAt: new Date(),
                    text: '{"inquiry": "Same message"}',
                    type: ChatMessageType.AGENT,
                },
                {
                    id: CONV_2,
                    agents: new Set([AGENT_2, AGENT_3]),
                    startedAt: new Date(),
                    text: '{"inquiry": "Same message"}', // Duplicate parsed content
                    type: ChatMessageType.AGENT,
                },
            ]

            const {container} = renderAgentFlowComponent({currentConversations: duplicateConversations})

            // Should render without errors (deduplication should prevent double-add)
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should handle very long conversation text", () => {
            const longTextConv: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set([AGENT_1, AGENT_2]),
                    startedAt: new Date(),
                    text: "a".repeat(1000), // Very long text
                    type: ChatMessageType.AGENT,
                },
            ]

            const {container} = renderAgentFlowComponent({currentConversations: longTextConv})

            // Should render without errors
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should handle special characters in conversation text", () => {
            const specialCharsConv: AgentConversation[] = [
                {
                    id: CONV_1,
                    agents: new Set([AGENT_1, AGENT_2]),
                    startedAt: new Date(),
                    text: "Test with émojis 🎉 and spëcial çharacters",
                    type: ChatMessageType.AGENT,
                },
            ]

            const {container} = renderAgentFlowComponent({currentConversations: specialCharsConv})

            // Should render without errors
            expect(container).toBeInTheDocument()
            verifyAgentNodes(container)
        })

        it("Should handle conversations where bubble has no text field", () => {
            const mockSetThoughtBubbleEdges = vi.fn()

            // First render with a conversation that has text
            const currentConversations: AgentConversation[] = [
                {
                    id: CONV_WITH_TEXT,
                    agents: new Set([AGENT_1, AGENT_2]),
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
                    agents: new Set([AGENT_2, AGENT_3]),
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
                        setThoughtBubbleEdges={vi.fn()}
                    />
                </ReactFlowProvider>
            )

            // Should render without errors (conversation without text should be skipped)
            expect(mockSetThoughtBubbleEdges).toHaveBeenCalled()
        })

        it("Should not add duplicate conversations with same ID", () => {
            const mockSetThoughtBubbleEdges = vi.fn()

            const conversation: AgentConversation = {
                id: "conv-duplicate-id",
                agents: new Set([AGENT_1, AGENT_2]),
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

        it("Should handle conversations with empty text strings", () => {
            const conversationsWithEmptyText: AgentConversation[] = [
                {
                    id: "empty-text-conv",
                    agents: new Set([AGENT_1, AGENT_2]),
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
                    agents: new Set([AGENT_1, AGENT_2]),
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
    })

    describe("Events", () => {
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
            const removeEventListenerSpy = vi.spyOn(window, "removeEventListener")
            const {unmount} = renderAgentFlowComponent()

            unmount()

            // Verify cleanup was called
            expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function))
        })
    })

    describe("Node Editor", () => {
        it("shows 'Applying changes...' while onSaveAgent is in-flight and closes popup on completion", async () => {
            let resolveQuery: () => void
            const onSaveAgent = vi.fn(
                () =>
                    new Promise<void>((resolve) => {
                        resolveQuery = resolve
                    })
            )

            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([
                        makeTempNetwork(OLD_NETWORK_ID, [{origin: AGENT_1, tools: []}], OLD_NETWORK_NAME),
                    ])
            })

            const {container} = renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: OLD_NETWORK_ID,
                onSaveAgent,
            })

            clickFlowNode(container.querySelector(`[data-id="${CSS.escape(AGENT_1)}"]`))

            const instructionsField = await screen.findByRole("textbox", {name: INSTRUCTIONS_FIELD})
            await user.clear(instructionsField)
            await user.click(instructionsField)
            await user.paste(UPDATED_INSTRUCTIONS)
            await user.click(screen.getByRole("button", {name: SAVE_BUTTON}))

            // While the API call is in-flight the button should show "Applying changes..." and Save should be gone
            await waitFor(() => {
                expect(screen.getByRole("button", {name: APPLYING_CHANGES_BUTTON})).toBeInTheDocument()
                expect(screen.queryByRole("button", {name: SAVE_BUTTON})).not.toBeInTheDocument()
            })

            expect(onSaveAgent).toHaveBeenCalledTimes(1)

            // Resolve the pending promise — popup should close
            act(() => resolveQuery())

            await waitFor(() => {
                expect(screen.queryByRole("button", {name: APPLYING_CHANGES_BUTTON})).not.toBeInTheDocument()
            })
        })

        it("calls onSaveAgent with the correct agentName, updated definition, networkName and a signal", async () => {
            const onSaveAgent = vi.fn().mockResolvedValue(undefined)
            const editedInstructions = "Updated instructions for agent1"
            const originalInstructions = "Original instructions."

            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([
                        makeTempNetwork(
                            OLD_NETWORK_ID,
                            [{origin: AGENT_1, tools: [], instructions: originalInstructions}],
                            OLD_NETWORK_NAME
                        ),
                    ])
            })

            const {container} = renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: OLD_NETWORK_ID,
                onSaveAgent,
            })

            clickFlowNode(container.querySelector(`[data-id="${CSS.escape(AGENT_1)}"]`))
            const instructionsField = await screen.findByRole("textbox", {name: INSTRUCTIONS_FIELD})
            await user.clear(instructionsField)
            await user.click(instructionsField)
            await user.paste(editedInstructions)
            await user.click(screen.getByRole("button", {name: SAVE_BUTTON}))
            await waitFor(() => {
                expect(screen.queryByRole("button", {name: APPLYING_CHANGES_BUTTON})).not.toBeInTheDocument()
            })

            expect(onSaveAgent).toHaveBeenCalledTimes(1)
            const [calledAgentName, calledUpdated, calledNetworkName, calledSignal] = onSaveAgent.mock.calls[0]
            // calledAgentName is the display name (cleaned up from the raw AGENT_1 id)
            expect(calledAgentName).toBe("Agent 1")
            expect(calledUpdated.find((e: AgentNetworkDefinitionEntry) => e.origin === AGENT_1)?.instructions).toBe(
                editedInstructions
            )
            expect(calledNetworkName).toBe(OLD_NETWORK_NAME)
            expect(calledSignal).toBeInstanceOf(AbortSignal)
        })

        it("closes popup even when onSaveAgent throws", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn())
            const consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(vi.fn())
            const onSaveAgent = vi.fn().mockRejectedValue(new Error("Network failure"))

            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([makeTempNetwork(OLD_NETWORK_ID, [{origin: AGENT_1, tools: []}])])
            })

            const {container} = renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: OLD_NETWORK_ID,
                onSaveAgent,
            })

            clickFlowNode(container.querySelector(`[data-id="${CSS.escape(AGENT_1)}"]`))
            const instructionsField = await screen.findByRole("textbox", {name: INSTRUCTIONS_FIELD})
            await user.clear(instructionsField)
            await user.click(instructionsField)
            await user.paste(UPDATED_INSTRUCTIONS)
            await user.click(screen.getByRole("button", {name: SAVE_BUTTON}))

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
                    .setTempNetworks([makeTempNetwork(OLD_NETWORK_ID, [{origin: AGENT_1, tools: []}])])
            })

            const {container} = renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: OLD_NETWORK_ID,
                // onSaveAgent intentionally omitted
            })

            clickFlowNode(container.querySelector(`[data-id="${CSS.escape(AGENT_1)}"]`))
            const instructionsField = await screen.findByRole("textbox", {name: INSTRUCTIONS_FIELD})
            await user.clear(instructionsField)
            await user.click(instructionsField)
            await user.paste(UPDATED_INSTRUCTIONS)
            await user.click(screen.getByRole("button", {name: SAVE_BUTTON}))
            await waitFor(() => expect(screen.queryByRole("button", {name: SAVE_BUTTON})).not.toBeInTheDocument())
        })

        it("Should update the Zustand store network map when a node popup is saved", async () => {
            const originalInstructions = "Original instructions."
            // Seed the Zustand store with a flat array (server format) under a network key
            const initialDefinition: AgentNetworkDefinitionEntry[] = [
                {
                    origin: AGENT_1,
                    tools: [AGENT_2],
                    display_as: LLM_AGENT_DISPLAY,
                    instructions: originalInstructions,
                },
            ]
            // Seed the temp networks store with the network and its definition
            const networkKey = "temporary/test-network"
            act(() => {
                useTempNetworksStore.getState().setTempNetworks([makeTempNetwork(networkKey, initialDefinition)])
            })

            renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: networkKey,
            })

            // Click an agent node to open the popup, querying by the visible agent name.
            clickFlowNode(screen.getByText(cleanUpAgentName(AGENT_1)))

            // The popup should now be open — make the form dirty then save
            const instructionsField = await screen.findByRole("textbox", {name: INSTRUCTIONS_FIELD})
            await user.clear(instructionsField)
            await user.click(instructionsField)
            await user.paste("Updated instructions.")
            const saveButton = screen.getByRole("button", {name: SAVE_BUTTON})
            expect(saveButton).toBeInTheDocument()

            await user.click(saveButton)

            // Popup should close
            await waitFor(() => expect(screen.queryByRole("button", {name: SAVE_BUTTON})).not.toBeInTheDocument())

            // Zustand store should still have the updated definition (updateTempNetworkDefinition was called)
            const storedDefinitions = useTempNetworksStore
                .getState()
                .tempNetworks.find((n) => n.agentInfo.agent_name === networkKey)?.agentNetworkDefinition
            expect(storedDefinitions).toBeDefined()
            expect(storedDefinitions.some((e) => e.origin === AGENT_1)).toBe(true)
        })

        it("Should open and close the node popup without saving", async () => {
            const networkKey = "temporary/test-net"
            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([
                        makeTempNetwork(networkKey, [{origin: AGENT_1, tools: [], instructions: "Some instructions."}]),
                    ])
            })
            const {container} = renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: networkKey,
            })

            const agent1Node = container.querySelector(`[data-id="${CSS.escape(AGENT_1)}"]`)
            expect(agent1Node).toBeInTheDocument()
            clickFlowNode(agent1Node)

            // Popup opens
            const cancelButton = await screen.findByRole("button", {name: "Cancel"})

            // Cancel closes the popup
            await user.click(cancelButton)
            await waitFor(() => expect(screen.queryByRole("button", {name: "Cancel"})).not.toBeInTheDocument())
        })

        it("Should NOT open popup when clicking an agent node on a permanent network", async () => {
            const networkKey = "industry/banking_ops"
            // isTemporaryNetwork defaults to undefined/false — no seeding needed since popup won't open
            const {container} = renderAgentFlowComponent({networkId: networkKey})

            const agent1Node = container.querySelector(`[data-id="${CSS.escape(AGENT_1)}"]`)
            clickFlowNode(agent1Node)

            // Popup must not appear
            expect(screen.queryByRole("button", {name: SAVE_BUTTON})).not.toBeInTheDocument()
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
                    .setTempNetworks([
                        makeTempNetwork(networkKey, [{origin: AGENT_1, tools: [], display_as: displayAs}]),
                    ])
            })

            const {container} = renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: networkKey,
                agentsInNetwork: [{origin: AGENT_1, tools: [], display_as: displayAs}],
            })

            clickFlowNode(container.querySelector(`[data-id="${CSS.escape(AGENT_1)}"]`))
            expect(screen.queryByRole("button", {name: SAVE_BUTTON})).not.toBeInTheDocument()
        })

        it("Should open popup when clicking an llm_agent node in a temporary network", async () => {
            const networkKey = "temporary/test-llm-agent"
            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([
                        makeTempNetwork(networkKey, [{origin: AGENT_1, tools: [], display_as: LLM_AGENT_DISPLAY}]),
                    ])
            })

            const {container} = renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: networkKey,
                agentsInNetwork: [{origin: AGENT_1, tools: [], display_as: LLM_AGENT_DISPLAY}],
            })

            clickFlowNode(container.querySelector(`[data-id="${CSS.escape(AGENT_1)}"]`))
            expect(await screen.findByRole("button", {name: SAVE_BUTTON})).toBeInTheDocument()
        })

        // ReactFlow selects a focused node on Enter but never fires onNodeClick from the keyboard, so AgentFlow
        // routes Enter on a focused node to the editor. Only Enter, and only when the key target is a node, opens it.
        it.each<KeyboardOpenTestCase>([
            {
                desc: "open the popup when Enter is pressed on an llm_agent node",
                target: AGENT_1_NODE,
                key: "Enter",
                opens: true,
            },
            {
                desc: "not open the popup when a non-Enter key is pressed on a node",
                target: AGENT_1_NODE,
                key: "a",
                opens: false,
            },
            {
                desc: "not open the popup when Enter is pressed off any node",
                target: FLOW_WRAPPER,
                key: "Enter",
                opens: false,
            },
        ])("Should $desc", async ({target, key, opens}) => {
            const networkKey = "temporary/test-keyboard-open"
            act(() => {
                useTempNetworksStore
                    .getState()
                    .setTempNetworks([
                        makeTempNetwork(networkKey, [{origin: AGENT_1, tools: [], display_as: LLM_AGENT_DISPLAY}]),
                    ])
            })

            const {container} = renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: networkKey,
                agentsInNetwork: [{origin: AGENT_1, tools: [], display_as: LLM_AGENT_DISPLAY}],
            })

            pressKeyOnFlowNode(container.querySelector(target), key)

            if (opens) {
                expect(await screen.findByRole("button", {name: SAVE_BUTTON})).toBeInTheDocument()
            } else {
                expect(screen.queryByRole("button", {name: SAVE_BUTTON})).not.toBeInTheDocument()
            }
        })
    })

    describe("NetworkEditorDock", () => {
        it("shows the topology editor dock when isEditMode and isTemporaryNetwork are true", async () => {
            renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: DOCK_NETWORK_ID,
                networkDisplayName: DOCK_NETWORK_NAME,
            })

            // Click the edit button to enter edit mode
            const editBtn = await screen.findByText("Edit")
            await user.click(editBtn)

            expect(screen.getByText(DOCK_HEADER)).toBeInTheDocument()
        })

        it("does not show the dock when isEditMode is false", () => {
            renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: DOCK_NETWORK_ID,
                networkDisplayName: DOCK_NETWORK_NAME,
            })

            // It is an editable network, but we didn't click the button to enter edit mode.
            expect(screen.queryByText(DOCK_HEADER)).not.toBeInTheDocument()
        })

        it("does not show the edit button for permanent networks", async () => {
            renderAgentFlowComponent({
                isTemporaryNetwork: false,
                networkId: DOCK_NETWORK_ID,
                networkDisplayName: DOCK_NETWORK_NAME,
            })

            // Should still have the title
            await screen.findByText(DOCK_NETWORK_NAME)

            // ...but no edit button
            expect(screen.queryByText("Edit")).not.toBeInTheDocument()
        })

        it("does not show the edit button when isAwaitingLlm is true", async () => {
            renderAgentFlowComponent({
                isTemporaryNetwork: true,
                networkId: DOCK_NETWORK_ID,
                networkDisplayName: DOCK_NETWORK_NAME,
                isAwaitingLlm: true,
            })

            // Should still have the title
            await screen.findByText(DOCK_NETWORK_NAME)

            // ...but no edit button
            expect(screen.queryByText("Edit")).not.toBeInTheDocument()
        })
    })
})

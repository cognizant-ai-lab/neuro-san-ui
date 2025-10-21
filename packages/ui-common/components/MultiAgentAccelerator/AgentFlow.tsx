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

import AdjustRoundedIcon from "@mui/icons-material/AdjustRounded"
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline"
import HubOutlinedIcon from "@mui/icons-material/HubOutlined"
import ScatterPlotOutlinedIcon from "@mui/icons-material/ScatterPlotOutlined"
import {ToggleButton, ToggleButtonGroup, useTheme} from "@mui/material"
import Box from "@mui/material/Box"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useRef, useState} from "react"
import {
    applyNodeChanges,
    Background,
    ConnectionMode,
    ControlButton,
    Controls,
    Edge,
    EdgeProps,
    EdgeTypes,
    NodeChange,
    ReactFlow,
    NodeTypes as RFNodeTypes,
    useReactFlow,
    useStore,
} from "reactflow"

import {AgentNode, AgentNodeProps, NODE_HEIGHT, NODE_WIDTH} from "./AgentNode"
import {
    BACKGROUND_COLORS,
    BACKGROUND_COLORS_DARK_IDX,
    BASE_RADIUS,
    DEFAULT_FRONTMAN_X_POS,
    DEFAULT_FRONTMAN_Y_POS,
    HEATMAP_COLORS,
    LEVEL_SPACING,
} from "./const"
import {addThoughtBubbleEdge, layoutLinear, layoutRadial, removeThoughtBubbleEdge} from "./GraphLayouts"
import {PlasmaEdge} from "./PlasmaEdge"
import {ThoughtBubbleEdge} from "./ThoughtBubbleEdge"
import {ThoughtBubbleOverlay} from "./ThoughtBubbleOverlay"
import {ConnectivityInfo} from "../../generated/neuro-san/NeuroSanClient"
import {usePreferences} from "../../state/Preferences"
import {AgentConversation} from "../../utils/agentConversations"
import {getZIndex} from "../../utils/zIndexLayers"

// #region: Types

// ActiveThoughtBubble mirrors AgentConversation but uses `conversationId` instead of `id`
// to make it explicit that this bubble maps back to an originating conversation.
interface ActiveThoughtBubble extends Omit<AgentConversation, "id"> {
    conversationId: string
}

export interface AgentFlowProps {
    readonly agentCounts?: Map<string, number>
    readonly agentsInNetwork: ConnectivityInfo[]
    readonly currentConversations?: AgentConversation[] | null
    readonly id: string
    readonly isAwaitingLlm?: boolean
    readonly isStreaming?: boolean
    readonly thoughtBubbleEdges: Map<string, {edge: Edge<EdgeProps>; timestamp: number}>
    readonly setThoughtBubbleEdges: Dispatch<SetStateAction<Map<string, {edge: Edge<EdgeProps>; timestamp: number}>>>
}

type Layout = "radial" | "linear"

// #endregion: Types

// #region: Constants

// Timeout for thought bubbles is set to 10 seconds
const THOUGHT_BUBBLE_TIMEOUT_MS = 10_000

// Maximum number of thought bubbles allowed on screen at any time. As more arrive, older ones are removed.
const MAX_THOUGHT_BUBBLES = 5

// #endregion: Constants

export const AgentFlow: FC<AgentFlowProps> = ({
    agentCounts,
    agentsInNetwork,
    currentConversations,
    id,
    isAwaitingLlm,
    isStreaming,
    thoughtBubbleEdges,
    setThoughtBubbleEdges,
}) => {
    const theme = useTheme()

    const {fitView} = useReactFlow()

    // Helper functions to update thought bubble edges state immutably
    const addThoughtBubbleEdgeHelper = useCallback(
        (conversationId: string, edge: Edge<EdgeProps>) => {
            setThoughtBubbleEdges((prev) => {
                const newMap = new Map(prev)
                addThoughtBubbleEdge(newMap, conversationId, edge)
                return newMap
            })
        },
        [setThoughtBubbleEdges]
    )

    const removeThoughtBubbleEdgeHelper = useCallback(
        (conversationId: string) => {
            setThoughtBubbleEdges((prev) => {
                const newMap = new Map(prev)
                removeThoughtBubbleEdge(newMap, conversationId)
                return newMap
            })
        },
        [setThoughtBubbleEdges]
    )

    const handleResize = useCallback(() => {
        fitView() // Adjusts the view to fit after resizing
    }, [fitView, isAwaitingLlm])

    useEffect(() => {
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [handleResize])

    // Save this as a mutable ref so child nodes see updates
    const conversationsRef = useRef<AgentConversation[] | null>(currentConversations)

    useEffect(() => {
        conversationsRef.current = currentConversations
    }, [currentConversations])

    const [layout, setLayout] = useState<Layout>("radial")

    const [coloringOption, setColoringOption] = useState<"depth" | "heatmap">("depth")

    const [enableRadialGuides, setEnableRadialGuides] = useState<boolean>(true)

    const [showThoughtBubbles, setShowThoughtBubbles] = useState<boolean>(true)

    // State for managing active thought bubbles with timers. Use ActiveThoughtBubble which
    // references the original conversation via `conversationId`.
    const [activeThoughtBubbles, setActiveThoughtBubbles] = useState<ActiveThoughtBubble[]>([])

    // Track conversation IDs we've already processed to prevent re-adding after expiry
    const processedConversationIdsRef = useRef<Set<string>>(new Set())

    // Track which bubble is currently being hovered
    const hoveredBubbleIdRef = useRef<string | null>(null)
    const handleBubbleHoverChange = useCallback((bubbleId: string | null) => {
        hoveredBubbleIdRef.current = bubbleId
    }, [])

    // Clear processed conversation IDs when thought bubble edges are cleared (streaming ends)
    useEffect(() => {
        if (thoughtBubbleEdges.size === 0) {
            processedConversationIdsRef.current.clear()
        }
    }, [thoughtBubbleEdges.size])

    // Effect to add and remove thought bubbles - only when we actually have conversations to process
    useEffect(() => {
        if (!currentConversations || currentConversations.length === 0) {
            return // Skip processing when no conversations
        }

        setActiveThoughtBubbles((prevBubbles) => {
            const newBubbles: ActiveThoughtBubble[] = []

            // Check what user actually sees (parsed text) as one level of duplicate prevention
            const processedText = new Set(prevBubbles.map((b) => b.text || ""))

            thoughtBubbleEdges.forEach((thoughtBubbleEdge) => {
                const edgeText = (thoughtBubbleEdge.edge.data as {text?: string})?.text
                if (edgeText) {
                    // Add edge text to existing parsed texts to prevent duplicates
                    processedText.add(edgeText)
                }
            })

            // Only add bubbles for conversations with unique parsed content
            for (const conv of currentConversations) {
                if (
                    // Has text
                    conv.text &&
                    // Haven't already displayed this text (duplicate check #1)
                    !processedText.has(conv.text) &&
                    // Haven't already displayed this conversation ID (duplicate check #2)
                    !processedConversationIdsRef.current.has(conv.id)
                ) {
                    // Create an AgentConversation object representing the active thought bubble.
                    // Use the conversation id from the incoming conversation and set startedAt
                    // to "now" so the bubble timeout is measured from when the bubble appeared.
                    newBubbles.push({
                        agents: new Set(conv.agents),
                        conversationId: conv.id,
                        startedAt: new Date(),
                        // No text needed. This is for tracking which conversations are active.
                    })

                    // Mark this conversation ID as processed. This protects against duplicates if conversations have
                    // the same ID, although some duplicates still get through.
                    processedConversationIdsRef.current.add(conv.id)

                    const agentList = Array.from(conv.agents)
                    // TODO: Check if agentList has at least 2 agents. This allows us to set a source and target.
                    // However, this can also have more than 2 agents. We may want to think more about that case.
                    if (agentList.length >= 2) {
                        // These source and target agents are going to be useful later when we point bubbles to nodes.
                        const sourceAgent = agentList[0]
                        const targetAgent = agentList[1]
                        const edge: Edge = {
                            id: `thought-bubble-${conv.id}`,
                            source: sourceAgent,
                            target: targetAgent,
                            type: "thoughtBubbleEdge",
                            data: {
                                text: conv.text,
                                showAlways: showThoughtBubbles,
                                conversationId: conv.id,
                            },
                            style: {pointerEvents: "none" as const},
                        }
                        addThoughtBubbleEdgeHelper(conv.id, edge)
                    }
                }
            }

            if (newBubbles.length === 0) {
                return prevBubbles // No changes
            }

            const allBubbles = [...prevBubbles, ...newBubbles]
            // If we're over the limit, first remove expired bubbles, then oldest if still needed
            if (allBubbles.length > MAX_THOUGHT_BUBBLES) {
                const now = Date.now()
                const dropped: ActiveThoughtBubble[] = []

                // First, filter out expired bubbles by checking THOUGHT_BUBBLE_TIMEOUT_MS
                const activeBubbles = allBubbles.filter((bubble) => {
                    const age = now - bubble.startedAt.getTime()
                    const isExpired = age >= THOUGHT_BUBBLE_TIMEOUT_MS
                    if (isExpired) {
                        dropped.push(bubble)
                    }
                    return !isExpired
                })

                // If still over the limit after removing expired, remove oldest non-expired
                let finalBubbles = activeBubbles
                if (activeBubbles.length > MAX_THOUGHT_BUBBLES) {
                    const sorted = activeBubbles.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
                    finalBubbles = sorted.slice(-MAX_THOUGHT_BUBBLES)
                    const additionalDropped = sorted.slice(0, -MAX_THOUGHT_BUBBLES)
                    dropped.push(...additionalDropped)
                }

                // Clean up all dropped bubbles from edge cache
                dropped.forEach((bubble) => {
                    removeThoughtBubbleEdgeHelper(bubble.conversationId)
                })

                return finalBubbles
            }
            return allBubbles
        })
    }, [currentConversations, addThoughtBubbleEdgeHelper, removeThoughtBubbleEdgeHelper])

    // Independent thought bubble cleanup - run timer only during streaming
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            // Only clean up if we're currently streaming
            if (!isStreaming) return

            setActiveThoughtBubbles((prevBubbles) => {
                if (prevBubbles.length === 0) return prevBubbles

                const now = Date.now()

                const filteredBubbles = prevBubbles.filter((bubble) => {
                    const age = now - bubble.startedAt.getTime()
                    const shouldKeep = age < THOUGHT_BUBBLE_TIMEOUT_MS

                    // Keep bubble if it's being hovered, even if expired
                    const isHovered = hoveredBubbleIdRef.current === `thought-bubble-${bubble.conversationId}`
                    if (isHovered) {
                        return true
                    }

                    // If bubble is expiring, remove it from the edge cache
                    if (!shouldKeep) {
                        removeThoughtBubbleEdgeHelper(bubble.conversationId)
                    }

                    return shouldKeep
                })

                // Only update if there are changes to prevent unnecessary re-renders
                if (filteredBubbles.length !== prevBubbles.length) {
                    return filteredBubbles
                }
                return prevBubbles
            })
        }, 1000) // Check every second

        return () => clearInterval(cleanupInterval)
    }, [isStreaming, removeThoughtBubbleEdgeHelper])

    // Memoize filtered conversations directly from activeThoughtBubbles
    const filteredConversations: AgentConversation[] | null = useMemo(() => {
        // Map ActiveThoughtBubble back to AgentConversation
        return activeThoughtBubbles.map((bubble: ActiveThoughtBubble) => ({
            id: bubble.conversationId,
            text: bubble.text,
            agents: bubble.agents,
            startedAt: bubble.startedAt,
        }))
    }, [activeThoughtBubbles])

    const {darkMode} = usePreferences()

    // Shadow color for icon. TODO: use MUI theme system instead.
    const shadowColor = darkMode ? "255, 255, 255" : "0, 0, 0"

    const isHeatmap = coloringOption === "heatmap"

    // Merge agents from active thought bubbles with agentsInNetwork for layout
    // This ensures bubble edges persist even when agents disappear from the network
    const bubbleAgentIds = useMemo(() => {
        const ids = new Set<string>()
        activeThoughtBubbles.forEach((bubble) => {
            bubble.agents.forEach((agentId) => ids.add(agentId))
        })
        return ids
    }, [activeThoughtBubbles])

    const mergedAgentsInNetwork = useMemo(() => {
        // Add any missing agents from bubbles as minimal ConnectivityInfo
        const existingIds = new Set(agentsInNetwork.map((a) => a.origin))
        const missing = Array.from(bubbleAgentIds).filter((bubbleAgentId) => !existingIds.has(bubbleAgentId))
        const minimalAgents = missing.map((missingId) => ({
            origin: missingId,
            tools: [] as string[],
            display_as: undefined as string | undefined,
        }))
        return [...agentsInNetwork, ...minimalAgents]
    }, [agentsInNetwork, bubbleAgentIds])

    // Create the flow layout depending on user preference
    // Memoize layoutResult so it only recalculates when relevant data changes
    const layoutResult = useMemo(
        () =>
            layout === "linear"
                ? layoutLinear(
                      isHeatmap ? agentCounts : undefined,
                      mergedAgentsInNetwork,
                      currentConversations,
                      isAwaitingLlm,
                      thoughtBubbleEdges
                  )
                : layoutRadial(
                      isHeatmap ? agentCounts : undefined,
                      mergedAgentsInNetwork,
                      currentConversations,
                      isAwaitingLlm,
                      thoughtBubbleEdges
                  ),
        [
            layout,
            coloringOption,
            agentCounts,
            mergedAgentsInNetwork,
            currentConversations,
            filteredConversations,
            thoughtBubbleEdges,
            isAwaitingLlm,
            showThoughtBubbles,
        ]
    )

    const [nodes, setNodes] = useState(layoutResult.nodes)

    // Sync up the nodes with the layout result
    useEffect(() => {
        setNodes(layoutResult.nodes)
    }, [layoutResult.nodes])

    const edges = layoutResult.edges

    useEffect(() => {
        // Schedule a fitView after the layout is set to ensure the view is adjusted correctly
        setTimeout(() => {
            fitView()
        }, 50)
    }, [agentsInNetwork, layout])

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((ns) =>
            applyNodeChanges<AgentNodeProps>(
                // For now we only allow dragging, no updates
                changes.filter((c) => c.type === "position"),
                ns
            )
        )
    }, [])

    const transform = useStore((state) => state.transform)

    // Why not just a "const"? See: https://reactflow.dev/learn/customization/custom-nodes
    // "It’s important that the nodeTypes are memoized or defined outside of the component. Otherwise React creates
    // a new object on every render which leads to performance issues and bugs."
    const nodeTypes: RFNodeTypes = useMemo(
        () => ({
            agentNode: AgentNode,
        }),
        [AgentNode]
    )

    const edgeTypes: EdgeTypes = useMemo(
        () => ({
            plasmaEdge: PlasmaEdge,
            thoughtBubbleEdge: ThoughtBubbleEdge,
        }),
        [PlasmaEdge, ThoughtBubbleEdge]
    )

    // Figure out the maximum depth of the network
    const maxDepth = useMemo(() => {
        return nodes?.reduce((max, node) => Math.max(node.data.depth, max), 0) + 1
    }, [nodes])

    // Generate radial guides for the network to guide the eye in the radial layout
    const getRadialGuides = () => {
        const circles = Array.from({length: maxDepth}).map((_, i) => (
            <circle
                id={`radial-guide-${BASE_RADIUS + (i + 1) * LEVEL_SPACING}`}
                key={`radial-guide-${BASE_RADIUS + (i + 1) * LEVEL_SPACING}`}
                cx={DEFAULT_FRONTMAN_X_POS + NODE_WIDTH / 2}
                cy={DEFAULT_FRONTMAN_Y_POS + NODE_HEIGHT / 2}
                r={BASE_RADIUS + (i + 1) * LEVEL_SPACING}
                stroke="var(--bs-gray-medium)"
                fill="none"
                opacity="0.25"
            />
        ))

        return (
            <svg
                id={`${id}-radial-guides`}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                }}
            >
                <g
                    id={`${id}-radial-guides-group`}
                    transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`}
                >
                    {circles}
                </g>
            </svg>
        )
    }

    // Generate Legend for depth or heatmap colors
    function getLegend() {
        const palette = isHeatmap ? HEATMAP_COLORS : BACKGROUND_COLORS
        const title = isHeatmap ? "Heat" : "Depth"
        const length = isHeatmap ? HEATMAP_COLORS.length : Math.min(maxDepth, BACKGROUND_COLORS.length)
        return (
            <Box
                id={`${id}-legend`}
                sx={{
                    position: "absolute",
                    top: "5px",
                    right: "10px",
                    padding: "5px",
                    borderRadius: "5px",
                    boxShadow: `0 0 5px rgba(${shadowColor}, 0.3)`,
                    display: "flex",
                    alignItems: "center",
                    zIndex: getZIndex(2, theme),
                }}
            >
                <Typography
                    id={`${id}-legend-label`}
                    sx={{
                        fontSize: "10px",
                        marginLeft: "0.2rem",
                    }}
                >
                    {title}
                </Typography>
                {/* Depth palette */}
                {Array.from({length}, (_, i) => (
                    <Box
                        id={`${id}-legend-depth-${i}`}
                        key={i}
                        style={{
                            alignItems: "center",
                            backgroundColor: palette[i],
                            borderRadius: "50%",
                            color: i < BACKGROUND_COLORS_DARK_IDX ? "var(--bs-primary)" : "var(--bs-white)",
                            display: "flex",
                            height: "15px",
                            justifyContent: "center",
                            marginLeft: "5px",
                            width: "15px",
                        }}
                    >
                        <Typography
                            id={`${id}-legend-depth-${i}-text`}
                            sx={{
                                fontSize: "8px",
                            }}
                        >
                            {i}
                        </Typography>
                    </Box>
                ))}
                <ToggleButtonGroup
                    id={`${id}-coloring-toggle`}
                    value={coloringOption}
                    exclusive={true}
                    onChange={(_, newValue) => {
                        if (newValue !== null) {
                            setColoringOption(newValue)
                        }
                    }}
                    sx={{
                        fontSize: "2rem",
                        zIndex: 10,
                        marginLeft: "0.5rem",
                        backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-white)",
                        border: darkMode ? "1px solid var(--bs-gray-medium)" : "1px solid var(--bs-gray-light)",
                    }}
                    size="small"
                >
                    <ToggleButton
                        id={`${id}-depth-toggle`}
                        size="small"
                        value="depth"
                        sx={{
                            fontSize: "0.5rem",
                            height: "1rem",
                            color: darkMode ? "var(--bs-white)" : "var(--bs-dark-mode-dim)",
                            backgroundColor:
                                darkMode && coloringOption === "depth" ? "var(--bs-gray-medium)" : undefined,
                        }}
                    >
                        <Typography
                            id={`${id}-depth-label`}
                            sx={{
                                fontSize: "10px",
                            }}
                        >
                            Depth
                        </Typography>
                    </ToggleButton>
                    <ToggleButton
                        id={`${id}-heatmap-toggle`}
                        size="small"
                        value="heatmap"
                        sx={{
                            fontSize: "0.5rem",
                            height: "1rem",
                            color: darkMode ? "var(--bs-white)" : "var(--bs-black)",
                            backgroundColor: darkMode && isHeatmap ? "var(--bs-gray-medium)" : undefined,
                        }}
                    >
                        <Typography
                            id={`${id}-heatmap-label`}
                            sx={{
                                fontSize: "10px",
                            }}
                        >
                            Heatmap
                        </Typography>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
        )
    }

    // Get the background color for the control buttons based on the layout and dark mode setting
    const getControlButtonBackgroundColor = (isActive: boolean) => {
        return isActive ? (darkMode ? "var(--bs-gray-dark)" : "var(--bs-gray-lighter)") : undefined
    }

    // Only show radial guides if radial layout is selected, radial guides are enabled, and it's not just Frontman
    const shouldShowRadialGuides = enableRadialGuides && layout === "radial" && maxDepth > 1

    // Generate the control bar for the flow, including layout and radial guides toggles
    const getControls = () => {
        return (
            <Controls
                id="react-flow-controls"
                position="top-left"
                style={{
                    position: "absolute",
                    top: "0px",
                    left: "0px",
                    height: "auto",
                    width: "auto",
                }}
                showInteractive={true}
            >
                <Tooltip
                    id="radial-layout-tooltip"
                    title="Radial layout"
                    placement="right"
                >
                    <span id="radial-layout-span">
                        <ControlButton
                            id="radial-layout-button"
                            onClick={() => setLayout("radial")}
                            style={{
                                backgroundColor: getControlButtonBackgroundColor(layout === "radial"),
                            }}
                        >
                            <HubOutlinedIcon
                                id="radial-layout-icon"
                                sx={{color: darkMode ? "var(--bs-white)" : "var(--bs-dark-mode-dim)"}}
                            />
                        </ControlButton>
                    </span>
                </Tooltip>
                <Tooltip
                    id="linear-layout-tooltip"
                    title="Linear layout"
                    placement="right"
                >
                    <span id="linear-layout-span">
                        <ControlButton
                            id="linear-layout-button"
                            onClick={() => setLayout("linear")}
                            style={{
                                backgroundColor: getControlButtonBackgroundColor(layout === "linear"),
                            }}
                        >
                            <ScatterPlotOutlinedIcon
                                id="linear-layout-icon"
                                sx={{color: darkMode ? "var(--bs-white)" : "var(--bs-dark-mode-dim)"}}
                            />
                        </ControlButton>
                    </span>
                </Tooltip>
                <Tooltip
                    id="radial-guides-tooltip"
                    title={`Enable/disable radial guides${
                        layout === "radial" ? "" : " (only available in radial layout)"
                    }`}
                    placement="right"
                >
                    <span id="radial-guides-span">
                        <ControlButton
                            id="radial-guides-button"
                            onClick={() => setEnableRadialGuides(!enableRadialGuides)}
                            style={{
                                backgroundColor: getControlButtonBackgroundColor(enableRadialGuides),
                            }}
                            disabled={layout !== "radial"}
                        >
                            <AdjustRoundedIcon
                                id="radial-guides-icon"
                                sx={{color: darkMode ? "var(--bs-white)" : "var(--bs-dark-mode-dim)"}}
                            />
                        </ControlButton>
                    </span>
                </Tooltip>
                <Tooltip
                    id="thought-bubble-tooltip"
                    title={`Toggle thought bubbles ${showThoughtBubbles ? "off" : "on"}`}
                    placement="right"
                >
                    <span id="thought-bubble-span">
                        <ControlButton
                            id="thought-bubble-button"
                            onClick={() => setShowThoughtBubbles(!showThoughtBubbles)}
                            style={{
                                backgroundColor: getControlButtonBackgroundColor(showThoughtBubbles),
                            }}
                        >
                            <ChatBubbleOutlineIcon
                                id="thought-bubble-icon"
                                sx={{color: darkMode ? "var(--bs-white)" : "var(--bs-dark-mode-dim)"}}
                            />
                        </ControlButton>
                    </span>
                </Tooltip>
            </Controls>
        )
    }

    return (
        <Box
            id={`${id}-outer-box`}
            sx={{
                height: "100%",
                width: "100%",
                "& .react-flow__node": {
                    border: "var(--bs-border-width) var(--bs-border-style) var(--bs-black)",
                    borderRadius: "var(--bs-border-radius-2xl)",
                },
            }}
            className={darkMode ? "dark" : undefined}
        >
            <ReactFlow
                id={`${id}-react-flow`}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                fitView={true}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
            >
                {!isAwaitingLlm && (
                    <>
                        {agentsInNetwork?.length ? getLegend() : null}
                        <Background id={`${id}-background`} />
                        {getControls()}
                        {shouldShowRadialGuides ? getRadialGuides() : null}
                    </>
                )}
            </ReactFlow>
            <ThoughtBubbleOverlay
                nodes={nodes}
                edges={edges}
                showThoughtBubbles={showThoughtBubbles}
                onBubbleHoverChange={handleBubbleHoverChange}
            />
        </Box>
    )
}

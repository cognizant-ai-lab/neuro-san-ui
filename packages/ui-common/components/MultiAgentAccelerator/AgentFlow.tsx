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
import Box from "@mui/material/Box"
import {useTheme} from "@mui/material/styles"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {
    applyNodeChanges,
    Background,
    ConnectionMode,
    ControlButton,
    Controls,
    EdgeTypes,
    NodeChange,
    ReactFlow,
    Node as RFNode,
    NodeTypes as RFNodeTypes,
    useReactFlow,
    useStore,
} from "@xyflow/react"
import {Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useRef, useState} from "react"

import {AgentConversation} from "./AgentConversations"
import {AgentNode, AgentNodeProps, NODE_HEIGHT, NODE_WIDTH} from "./AgentNode"
import {BASE_RADIUS, DEFAULT_FRONTMAN_X_POS, DEFAULT_FRONTMAN_Y_POS, LEVEL_SPACING} from "./const"
import {addThoughtBubbleEdge, layoutLinear, layoutRadial, LayoutResult} from "./GraphLayouts"
import {PlasmaEdge} from "./PlasmaEdge"
import {ThoughtBubbleEdge, ThoughtBubbleEdgeShape} from "./ThoughtBubbleEdge"
import {ThoughtBubbleOverlay} from "./ThoughtBubbleOverlay"
import {AgentIconSuggestions} from "../../controller/Types/AgentIconSuggestions"
import {ConnectivityInfo} from "../../generated/neuro-san/NeuroSanClient"
import {usePalette} from "../../Theme/Palettes"
import {getZIndex} from "../../utils/zIndexLayers"

// #region: Types

export interface AgentFlowProps {
    readonly agentCounts?: Map<string, number>
    readonly agentIconSuggestions?: AgentIconSuggestions
    readonly agentsInNetwork: ConnectivityInfo[]
    readonly currentConversations?: AgentConversation[] | null
    readonly id: string
    readonly isAwaitingLlm?: boolean
    readonly isAgentNetworkDesignerMode?: boolean
    readonly isStreaming?: boolean
    readonly thoughtBubbleEdges: Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>
    readonly setThoughtBubbleEdges?: Dispatch<
        SetStateAction<Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>>
    >
}

type Layout = "radial" | "linear"

// #endregion: Types

// #region: Constants

// Timeout for thought bubbles is set to 10 seconds
const THOUGHT_BUBBLE_TIMEOUT_MS = 10_000

// #endregion: Constants

export const AgentFlow: FC<AgentFlowProps> = ({
    agentCounts,
    agentIconSuggestions,
    agentsInNetwork,
    currentConversations,
    id,
    isAgentNetworkDesignerMode,
    isAwaitingLlm,
    isStreaming,
    thoughtBubbleEdges,
    setThoughtBubbleEdges,
}) => {
    const theme = useTheme()

    const {fitView} = useReactFlow()

    const handleResize = useCallback(() => {
        void fitView() // Adjusts the view to fit after resizing
    }, [fitView])

    useEffect(() => {
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [handleResize])

    const [layout, setLayout] = useState<Layout>("radial")

    const [coloringOption, setColoringOption] = useState<"depth" | "heatmap">("depth")

    const [enableRadialGuides, setEnableRadialGuides] = useState<boolean>(true)

    const [showThoughtBubbles, setShowThoughtBubbles] = useState<boolean>(true)

    // Track conversation IDs we've already processed to prevent re-adding after expiry
    const processedConversationIdsRef = useRef<Set<string>>(new Set())

    // Track which bubble is currently being hovered
    const hoveredBubbleIdRef = useRef<string | null>(null)
    const handleBubbleHoverChange = useCallback((bubbleId: string | null) => {
        hoveredBubbleIdRef.current = bubbleId
    }, [])

    // Ref for isStreaming, read inside the cleanup interval.
    const isStreamingRef = useRef<boolean | undefined>(isStreaming)

    // Keep the ref current after every render.
    useEffect(() => {
        isStreamingRef.current = isStreaming
    })

    // Clear processed conversation IDs when thought bubble edges are cleared (streaming ends)
    useEffect(() => {
        if (thoughtBubbleEdges.size === 0) {
            processedConversationIdsRef.current.clear()
        }
    }, [thoughtBubbleEdges.size])

    // Add new thought bubble edges for incoming conversations.
    useEffect(() => {
        if (!currentConversations || currentConversations.length === 0) return

        setThoughtBubbleEdges?.((prev) => {
            const processedText = new Set<string>()
            for (const entry of prev.values()) {
                const text = (entry.edge.data as {text?: string})?.text?.trim()
                if (text) processedText.add(text)
            }

            let edgesMap: Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}> | null = null

            for (const conv of currentConversations) {
                const convText = conv.text?.trim()
                const agentList = Array.from(conv.agents)

                if (
                    convText &&
                    agentList.length >= 2 &&
                    !processedText.has(convText) &&
                    !processedConversationIdsRef.current.has(conv.id)
                ) {
                    if (!edgesMap) edgesMap = new Map(prev)

                    processedConversationIdsRef.current.add(conv.id)
                    processedText.add(convText)

                    const edge: ThoughtBubbleEdgeShape = {
                        id: `thought-bubble-${conv.id}`,
                        source: agentList[0],
                        target: agentList[1],
                        type: "thoughtBubbleEdge",
                        data: {
                            text: conv.text,
                            showAlways: showThoughtBubbles,
                            conversationId: conv.id,
                            agents: agentList,
                            type: conv.type,
                        },
                        style: {pointerEvents: "none" as const},
                    }
                    addThoughtBubbleEdge(edgesMap, conv.id, edge) // also enforces MAX_GLOBAL_THOUGHT_BUBBLES
                }
            }

            return edgesMap ?? prev
        })
    }, [currentConversations, showThoughtBubbles, setThoughtBubbleEdges])

    // Cleanup expired thought bubble edges — created once on mount, reads isStreaming via ref.
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            if (!isStreamingRef.current) return

            const now = Date.now()
            setThoughtBubbleEdges?.((prev) => {
                let changed = false
                const edgesMap = new Map(prev)
                for (const [convId, entry] of prev) {
                    const isHovered = hoveredBubbleIdRef.current === `thought-bubble-${convId}`
                    if (!isHovered && now - entry.timestamp >= THOUGHT_BUBBLE_TIMEOUT_MS) {
                        edgesMap.delete(convId)
                        changed = true
                    }
                }
                return changed ? edgesMap : prev
            })
        }, 1000)

        return () => clearInterval(cleanupInterval)
    }, [setThoughtBubbleEdges]) // mount/unmount only

    // Shadow color for icon
    const shadowColor = theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.common.black
    const isHeatmap = coloringOption === "heatmap"

    const palette = usePalette()

    // Merge agents from active thought bubbles with agentsInNetwork for layout
    // This ensures bubble edges persist even when agents disappear from the network
    const bubbleAgentIds: Set<string> = useMemo(() => {
        const ids = new Set<string>()
        thoughtBubbleEdges.forEach(({edge}) => {
            const agents = (edge.data as {agents?: string[]})?.agents ?? []
            agents.forEach((agentId) => ids.add(agentId))
        })
        return ids
    }, [thoughtBubbleEdges])

    const mergedAgentsInNetwork: ConnectivityInfo[] = useMemo(() => {
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
    const layoutResult: LayoutResult = useMemo(
        () =>
            layout === "linear"
                ? layoutLinear(
                      isHeatmap ? agentCounts : undefined,
                      mergedAgentsInNetwork,
                      currentConversations,
                      isAwaitingLlm,
                      isAgentNetworkDesignerMode,
                      thoughtBubbleEdges,
                      agentIconSuggestions
                  )
                : layoutRadial(
                      isHeatmap ? agentCounts : undefined,
                      mergedAgentsInNetwork,
                      currentConversations,
                      isAwaitingLlm,
                      isAgentNetworkDesignerMode,
                      thoughtBubbleEdges,
                      agentIconSuggestions
                  ),
        [
            agentCounts,
            agentIconSuggestions,
            currentConversations,
            isAgentNetworkDesignerMode,
            isAwaitingLlm,
            isHeatmap,
            layout,
            mergedAgentsInNetwork,
            thoughtBubbleEdges,
        ]
    )

    const [nodes, setNodes] = useState<RFNode<AgentNodeProps>[]>(layoutResult.nodes)

    // Sync up the nodes with the layout result
    useEffect(() => {
        setNodes(layoutResult.nodes)
    }, [layoutResult.nodes])

    const edges = layoutResult.edges

    // Make sure to extract only thought bubble edges for the overlay.
    const thoughtBubbleEdgesForOverlay: ThoughtBubbleEdgeShape[] = useMemo(
        () => edges.filter((e): e is ThoughtBubbleEdgeShape => e.type === "thoughtBubbleEdge"),
        [edges]
    )

    useEffect(() => {
        // Schedule a fitView after the layout is set to ensure the view is adjusted correctly
        setTimeout(() => {
            void fitView()
        }, 50)
    }, [agentsInNetwork, fitView, layout])

    const onNodesChange = useCallback(
        (changes: NodeChange<RFNode<AgentNodeProps>>[]) => {
            setNodes((currentNodes) =>
                applyNodeChanges<RFNode<AgentNodeProps>>(
                    // For now, we only allow dragging, no updates. In agent network designer mode, doesn't make sense
                    // to allow position changes since the user isn't actually manipulating a real network
                    changes.filter((c) => c.type === "position" && !isAgentNetworkDesignerMode),
                    currentNodes
                )
            )
        },
        [isAgentNetworkDesignerMode]
    )

    const transform = useStore((state) => state.transform)

    // Why not just a "const"? See: https://reactflow.dev/learn/customization/custom-nodes
    // "It’s important that the nodeTypes are memoized or defined outside the component. Otherwise, React creates
    // a new object on every render which leads to performance issues and bugs."
    const nodeTypes: RFNodeTypes = useMemo(
        () => ({
            agentNode: AgentNode,
        }),
        []
    )

    const edgeTypes: EdgeTypes = useMemo(
        () => ({
            plasmaEdge: PlasmaEdge,
            thoughtBubbleEdge: ThoughtBubbleEdge,
        }),
        []
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
    const getLegend = () => {
        const length = isHeatmap ? palette.length : Math.min(maxDepth, palette.length)
        return (
            <Box
                id={`${id}-legend`}
                sx={{
                    position: "absolute",
                    top: "5px",
                    right: "10px",
                    padding: "5px",
                    borderRadius: "5px",
                    boxShadow: `0 0 5px color-mix(in srgb, ${shadowColor} 30%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    zIndex: getZIndex(2, theme),
                }}
            >
                {/* Depth palette */}
                {Array.from({length}, (_, i) => (
                    <Box
                        id={`${id}-legend-depth-${i}`}
                        key={i}
                        style={{
                            alignItems: "center",
                            backgroundColor: palette[i],
                            borderRadius: "50%",
                            color: theme.palette.getContrastText(palette[i]),
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
        if (!isActive) {
            return undefined
        }
        return theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.grey[200]
    }

    // Only show radial guides if radial layout is selected, radial guides are enabled, and it's not just Frontman
    const shouldShowRadialGuides = enableRadialGuides && layout === "radial" && maxDepth > 1

    // Generate the control bar for the flow, including layout and radial guides toggles
    const getControls = () => {
        return (
            <Controls
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
                            <HubOutlinedIcon id="radial-layout-icon" />
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
                            <ScatterPlotOutlinedIcon id="linear-layout-icon" />
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
                            <AdjustRoundedIcon id="radial-guides-icon" />
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
                            <ChatBubbleOutlineIcon id="thought-bubble-icon" />
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
                backgroundColor: theme.palette.background.default,
                "& .react-flow__node": {
                    border: `1px solid ${theme.palette.divider}`,
                },
                "& .react-flow__panel": {
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    color: theme.palette.text.primary,
                },
                "& .react-flow__controls-button": {
                    backgroundColor: theme.palette.background.paper,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    color: theme.palette.text.primary,
                    fill: theme.palette.text.primary,
                },
            }}
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
                        {agentsInNetwork?.length && !isAgentNetworkDesignerMode ? getLegend() : null}
                        <Background id={`${id}-background`} />
                        {!isAgentNetworkDesignerMode && getControls()}
                        {shouldShowRadialGuides ? getRadialGuides() : null}
                    </>
                )}
            </ReactFlow>
            <ThoughtBubbleOverlay
                nodes={nodes}
                edges={thoughtBubbleEdgesForOverlay}
                showThoughtBubbles={showThoughtBubbles}
                isStreaming={isStreaming}
                onBubbleHoverChange={handleBubbleHoverChange}
            />
        </Box>
    )
}

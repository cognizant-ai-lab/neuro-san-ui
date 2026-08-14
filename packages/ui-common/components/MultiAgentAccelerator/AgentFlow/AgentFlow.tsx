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
import ChatBubbleOutlinedIcon from "@mui/icons-material/ChatBubbleOutlined"
import EditIcon from "@mui/icons-material/Edit"
import HubOutlinedIcon from "@mui/icons-material/HubOutlined"
import ScatterPlotOutlinedIcon from "@mui/icons-material/ScatterPlotOutlined"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import {alpha, useTheme} from "@mui/material/styles"
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
    NodeMouseHandler,
    ReactFlow,
    Node as RFNode,
    NodeTypes as RFNodeTypes,
    useReactFlow,
    useStore,
} from "@xyflow/react"
import {
    Dispatch,
    FC,
    KeyboardEventHandler,
    SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"

import {AgentConversation} from "../AgentConversations"
import {AgentNode, AgentNodeProps, NODE_HEIGHT, NODE_WIDTH} from "./AgentNode"
import {
    AgentNetworkDefinitionEntry,
    BASE_RADIUS,
    DEFAULT_FRONTMAN_X_POS,
    DEFAULT_FRONTMAN_Y_POS,
    LEVEL_SPACING,
} from "../const"
import {addThoughtBubbleEdge, layoutLinear, layoutRadial, LayoutResult} from "./GraphLayouts"
import {PlasmaEdge} from "./PlasmaEdge"
import {AgentIconSuggestions} from "../../../controller/Types/AgentIconSuggestions"
import {ConnectivityInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {GraphColoringOption, Layout, usePalette, useSettingsStore} from "../../../state/Settings"
import {useTempNetworksStore} from "../../../state/TemporaryNetworks"
import {getZIndex} from "../../../utils/zIndexLayers"
import {AgentNodeEditor} from "../Editor/AgentNodeEditor"
import {NetworkEditorDock} from "../Editor/NetworkEditorDock"
import {isEditableAgent} from "../TemporaryNetworks"
import {ThoughtBubbleEdge, ThoughtBubbleEdgeShape} from "../ThoughtBubbles/ThoughtBubbleEdge"
import {ThoughtBubbleOverlay} from "../ThoughtBubbles/ThoughtBubbleOverlay"

//#region: Types
export interface AgentFlowProps {
    readonly agentCounts?: Map<string, number>
    readonly agentIconSuggestions?: AgentIconSuggestions
    readonly agentsInNetwork: ConnectivityInfo[]
    readonly currentConversations?: AgentConversation[] | null
    readonly currentUser?: string
    readonly id: string
    readonly isAwaitingLlm?: boolean
    readonly isAgentNetworkDesignerMode?: boolean
    readonly isEditingNetwork?: boolean
    readonly isStreaming?: boolean
    readonly isTemporaryNetwork?: boolean
    /** The history key for the currently selected network (used to scope sly_data reads/writes per network). */
    readonly networkId?: string
    readonly neuroSanURL?: string
    /**
     * Called after a popup save triggers a new network reservation that replaces the currently viewed network.
     * @param oldNetworkId The agent_name of the network that was replaced.
     * @param newNetworkId The agent_name of the replacement network to navigate to.
     */
    readonly networkDisplayName?: string
    /**
     * Setter for changing the selected network.
     */
    readonly setSelectedNetwork?: (network: string | null) => void
    readonly setIsEditingNetwork?: (value: boolean) => void
    readonly onSaveAgent?: (
        agentName: string,
        updated: AgentNetworkDefinitionEntry[],
        agentNetworkName: string | undefined,
        signal: AbortSignal
    ) => Promise<void>
    readonly thoughtBubbleEdges: Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>
    readonly setThoughtBubbleEdges?: Dispatch<
        SetStateAction<Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>>
    >
}

//#endregion: Types

//#region: Constants

const THOUGHT_BUBBLE_TIMEOUT_MS = 10_000

//#endregion: Constants

//#region: Helpers

/**
 * Filters node events based on the current mode. Don't allow any topological-modifying events (adding, deleting nodes)
 * and in Agent Network Designer mode, don't allow dragging nodes (position changes) either.
 * @param change The node change event to filter.
 * @param isAgentNetworkDesignerMode Whether the flow is in Agent Network Designer mode (read-only preview).
 * @return True if the event should be allowed, false if it should be filtered out.
 */
export const filterNodeEvents = (change: NodeChange<RFNode<AgentNodeProps>>, isAgentNetworkDesignerMode: boolean) => {
    // Only allow nodes to be dragged, no topological edits to the graph (read-only)
    if (["remove", "add", "replace"].includes(change.type)) return false

    // Disallow dragging nodes in AND mode since it's supposed to be a read-only preview but
    // pass along all other event types as
    return !(change.type === "position" && isAgentNetworkDesignerMode)
}

//#endregion: Helpers

export const AgentFlow: FC<AgentFlowProps> = ({
    agentCounts,
    agentIconSuggestions,
    agentsInNetwork,
    currentConversations,
    currentUser,
    id,
    isAgentNetworkDesignerMode,
    isAwaitingLlm,
    isEditingNetwork,
    isStreaming,
    isTemporaryNetwork,
    networkDisplayName,
    networkId,
    neuroSanURL,
    onSaveAgent,
    thoughtBubbleEdges,
    setIsEditingNetwork,
    setSelectedNetwork,
    setThoughtBubbleEdges,
}) => {
    const theme = useTheme()

    const {fitView} = useReactFlow()
    const flowWrapperRef = useRef<HTMLDivElement | null>(null)
    const fitViewFrameRef = useRef<number | null>(null)

    const scheduleFitView = useCallback(() => {
        if (fitViewFrameRef.current !== null) {
            window.cancelAnimationFrame(fitViewFrameRef.current)
        }

        fitViewFrameRef.current = window.requestAnimationFrame(() => {
            fitViewFrameRef.current = null
            void fitView()
        })
    }, [fitView])

    useEffect(() => {
        return () => {
            if (fitViewFrameRef.current !== null) {
                window.cancelAnimationFrame(fitViewFrameRef.current)
                fitViewFrameRef.current = null
            }
        }
    }, [])

    /**
     * Effect to observe the flow wrapper's size and trigger fitView when it changes.
     * This ensures that the flow view adjusts to the container size. If the user resizes that window itself,
     * that will also cause the container size to change so this event will catch it.
     */
    useEffect(() => {
        if (!flowWrapperRef.current) return undefined

        const resizeObserver = new ResizeObserver(([entry]) => {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                scheduleFitView()
            }
        })

        resizeObserver.observe(flowWrapperRef.current)

        return () => {
            resizeObserver.disconnect()
        }
    }, [scheduleFitView])

    const updateSettings = useSettingsStore((state) => state.updateSettings)

    const layout = useSettingsStore((state) => state.settings.appearance.layout)
    const setLayout = (newLayout: Layout) => {
        updateSettings({
            appearance: {
                layout: newLayout,
            },
        })
    }

    const graphColoringOption = useSettingsStore((state) => state.settings.appearance.graphColoringOption)
    const setGraphColoringOption = (newValue: GraphColoringOption) => {
        updateSettings({
            appearance: {
                graphColoringOption: newValue,
            },
        })
    }

    const showRadialGuides = useSettingsStore((state) => state.settings.appearance.showRadialGuides)
    const setShowRadialGuides = (newValue: boolean) => {
        updateSettings({
            appearance: {
                showRadialGuides: newValue,
            },
        })
    }

    const showThoughtBubbles = useSettingsStore((state) => state.settings.appearance.showThoughtBubbles)
    const setShowThoughtBubbles = (newValue: boolean) => {
        updateSettings({
            appearance: {
                showThoughtBubbles: newValue,
            },
        })
    }

    // Read temporary networks to find agent_network_definition for the currently selected network.
    const tempNetworks = useTempNetworksStore((state) => state.tempNetworks)

    // Track conversation IDs we've already processed to prevent re-adding after expiry
    const processedConversationIdsRef = useRef<Set<string>>(new Set())

    // Track which bubble is currently being hovered
    const hoveredBubbleIdRef = useRef<string | null>(null)
    const handleBubbleHoverChange = useCallback((bubbleId: string | null) => {
        hoveredBubbleIdRef.current = bubbleId
    }, [])

    // Ref for isStreaming, read inside the cleanup interval.
    const isStreamingRef = useRef<boolean | undefined>(isStreaming)

    // Display option for agent/network names
    const useNativeNames = useSettingsStore((state) => state.settings.appearance.useNativeNames)

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
                const agentList = [...conv.agents]

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

    // Clean up expired thought bubble edges — created once on mount, reads isStreaming via ref.
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

    const isHeatmap = graphColoringOption === "heatmap"

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
        const missing = [...bubbleAgentIds].filter((bubbleAgentId) => !existingIds.has(bubbleAgentId))
        const minimalAgents = missing.map((missingId): ConnectivityInfo => ({
            origin: missingId,
            tools: [] as string[],
            display_as: undefined,
        }))
        return [...agentsInNetwork, ...minimalAgents]
    }, [agentsInNetwork, bubbleAgentIds])

    // Create the flow layout depending on user preference
    // Memoize layoutResult so it only recalculates when relevant data changes
    const layoutResult: LayoutResult = useMemo(() => {
        if (mergedAgentsInNetwork.length > 0) {
            return layout === "linear"
                ? layoutLinear({
                      agentCounts: isHeatmap ? agentCounts : undefined,
                      agentIconSuggestions,
                      agentsInNetwork: mergedAgentsInNetwork,
                      currentConversations,
                      isAgentNetworkDesignerMode,
                      isAwaitingLlm,
                      isTemporaryNetwork,
                      thoughtBubbleEdges,
                      useNativeNames,
                  })
                : layoutRadial({
                      agentCounts: isHeatmap ? agentCounts : undefined,
                      agentIconSuggestions,
                      agentsInNetwork: mergedAgentsInNetwork,
                      currentConversations,
                      isAgentNetworkDesignerMode,
                      isAwaitingLlm,
                      isTemporaryNetwork,
                      thoughtBubbleEdges,
                      useNativeNames,
                  })
        } else {
            return {nodes: [], edges: []}
        }
    }, [
        agentCounts,
        agentIconSuggestions,
        currentConversations,
        isAgentNetworkDesignerMode,
        isAwaitingLlm,
        isHeatmap,
        isTemporaryNetwork,
        layout,
        mergedAgentsInNetwork,
        thoughtBubbleEdges,
        useNativeNames,
    ])

    const [nodes, setNodes] = useState<RFNode<AgentNodeProps>[]>(layoutResult.nodes)

    // Sync up the nodes with the layout result
    useEffect(() => {
        setNodes(layoutResult.nodes)
    }, [layoutResult.nodes])

    // Track which node the user clicked on so we can open the popup
    const [selectedAgent, setSelectedAgent] = useState<{
        agentId: string
        agentName: string
        initialInstructions: string
        initialDescription: string
    } | null>(null)
    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false)

    const openNodeEditor = useCallback(
        (node: RFNode<AgentNodeProps>) => {
            // Popup is only available for temporary networks.
            if (!isTemporaryNetwork) return

            // Only llm_agent nodes support instructions/description editing.
            if (!isEditableAgent(node.data.displayAs)) return

            // Find the agent's existing instructions and description from the temp network definition.
            const currentTempNetwork = networkId
                ? tempNetworks.find((n) => n.agentInfo.agent_name === networkId)
                : undefined
            const currentAgentDefinition = currentTempNetwork?.agentNetworkDefinition?.find((e) => e.origin === node.id)

            setSelectedAgent({
                agentId: node.id,
                agentName: node.data.agentName,
                initialInstructions: currentAgentDefinition?.instructions ?? "",
                initialDescription: currentAgentDefinition?.description ?? "",
            })
            setIsPopupOpen(true)
        },
        [tempNetworks, isTemporaryNetwork, networkId]
    )

    const handleNodeClick: NodeMouseHandler<RFNode<AgentNodeProps>> = useCallback(
        (_event, node) => openNodeEditor(node),
        [openNodeEditor]
    )

    // ReactFlow makes nodes focusable and selects them on Enter, but it never fires onNodeClick from the keyboard.
    // Route Enter on a focused node to the editor so keyboard users can open a node the same way a click does.
    const handleNodeKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
        (event) => {
            if (event.key !== "Enter") return

            const target = event.target
            if (!(target instanceof HTMLElement)) return

            const nodeId = target.closest<HTMLElement>(".react-flow__node")?.dataset["id"]
            const node = nodeId ? nodes.find((n) => n.id === nodeId) : undefined
            if (node) openNodeEditor(node)
        },
        [nodes, openNodeEditor]
    )

    const edges = layoutResult.edges

    // Make sure to extract only thought bubble edges for the overlay.
    const thoughtBubbleEdgesForOverlay: ThoughtBubbleEdgeShape[] = useMemo(
        () => edges.filter((e): e is ThoughtBubbleEdgeShape => e.type === "thoughtBubbleEdge"),
        [edges]
    )

    useEffect(() => {
        scheduleFitView()
    }, [agentsInNetwork, layout, scheduleFitView])

    const onNodesChange = useCallback(
        (changes: NodeChange<RFNode<AgentNodeProps>>[]) => {
            setNodes((currentNodes) =>
                applyNodeChanges<RFNode<AgentNodeProps>>(
                    changes.filter((change) => filterNodeEvents(change, isAgentNetworkDesignerMode)),
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
                    alignItems: "center",
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: `0 2px 8px ${alpha(theme.palette.text.primary, 0.18)}`,
                    borderRadius: "5px",
                    display: "flex",
                    padding: theme.spacing(0.5),
                    position: "absolute",
                    right: theme.spacing(2),
                    top: theme.spacing(4),
                    zIndex: getZIndex(2, theme),
                }}
            >
                {/* Depth palette */}
                {Array.from({length}, (_, i) => (
                    <Box
                        id={`${id}-legend-depth-${i}`}
                        key={i}
                        sx={{
                            alignItems: "center",
                            backgroundColor: palette[i],
                            borderRadius: "50%",
                            color: theme.palette.getContrastText(palette[i]),
                            display: "flex",
                            fontSize: "0.5rem",
                            justifyContent: "center",
                            marginLeft: theme.spacing(0.75),
                            width: "15px",
                        }}
                    >
                        {i}
                    </Box>
                ))}
                <ToggleButtonGroup
                    id={`${id}-coloring-toggle`}
                    value={graphColoringOption}
                    exclusive={true}
                    onChange={(_, newValue) => {
                        if (newValue !== null) {
                            setGraphColoringOption(newValue)
                        }
                    }}
                    size="small"
                    sx={{
                        marginLeft: theme.spacing(2),
                        "& .MuiToggleButton-root": {
                            borderColor: theme.palette.divider,
                            color: theme.palette.text.primary,
                            minHeight: 22,
                            px: 1,
                            "&:hover": {
                                backgroundColor: theme.palette.action.hover,
                            },
                            "&.Mui-selected": {
                                backgroundColor: theme.palette.action.selected,
                                borderColor: theme.palette.text.primary,
                            },
                            "&.Mui-selected:hover": {
                                backgroundColor: theme.palette.action.selected,
                                borderColor: theme.palette.text.primary,
                            },
                        },
                    }}
                >
                    <ToggleButton
                        id={`${id}-depth-toggle`}
                        value="depth"
                        sx={{
                            fontSize: "0.5rem",
                            height: "1rem",
                        }}
                    >
                        Depth
                    </ToggleButton>
                    <ToggleButton
                        id={`${id}-heatmap-toggle`}
                        value="heatmap"
                        sx={{
                            fontSize: "0.5rem",
                            height: "1rem",
                        }}
                    >
                        Heatmap
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
        )
    }

    // Get the background color for the control buttons; differs based on whether the button is active or not
    const getControlButtonBackgroundColor = (isActive: boolean) => {
        return isActive ? theme.palette.action.selected : undefined
    }

    // Only show radial guides if radial layout is selected, radial guides are enabled, and it's not just Frontman
    const shouldShowRadialGuides = showRadialGuides && layout === "radial" && maxDepth > 1

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
                            onClick={() => setShowRadialGuides(!showRadialGuides)}
                            style={{
                                backgroundColor: getControlButtonBackgroundColor(showRadialGuides),
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
                            <ChatBubbleOutlinedIcon id="thought-bubble-icon" />
                        </ControlButton>
                    </span>
                </Tooltip>
            </Controls>
        )
    }

    const getTitle = () => {
        if (!networkDisplayName) return null

        return (
            <Box
                id={`${id}-network-title-bar`}
                sx={{
                    alignItems: "center",
                    display: "flex",
                    gap: 1,
                    left: "50%",
                    pointerEvents: "none",
                    position: "absolute",
                    top: theme.spacing(1),
                    transform: "translateX(-50%)",
                    zIndex: getZIndex(2, theme),
                }}
            >
                <Tooltip
                    title={networkDisplayName}
                    placement="top"
                >
                    <Typography
                        id={`${id}-network-title`}
                        variant="subtitle1"
                        sx={{
                            backdropFilter: "blur(6px)",
                            backgroundColor: alpha(theme.palette.background.paper, 0.75),
                            border: `1px solid ${alpha(theme.palette.divider, 0.75)}`,
                            borderRadius: 2,
                            boxShadow: theme.shadows[6],
                            color: theme.palette.text.primary,
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                            lineHeight: 1.35,
                            maxWidth: 400,
                            overflow: "hidden",
                            pointerEvents: "auto",
                            px: 2,
                            py: 0.45,
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {networkDisplayName}
                    </Typography>
                </Tooltip>
                {isTemporaryNetwork && !isEditingNetwork && !isAwaitingLlm && (
                    <Button
                        id={`${id}-enter-edit-mode-btn`}
                        variant="contained"
                        size="small"
                        onClick={() => setIsEditingNetwork(true)}
                        startIcon={<EditIcon />}
                        sx={{
                            pointerEvents: "auto",
                            "&:hover": {backgroundColor: theme.palette.primary.main},
                        }}
                    >
                        Edit
                    </Button>
                )}
            </Box>
        )
    }

    return (
        <Box
            id={`${id}-outer-box`}
            sx={{
                display: "flex",
                flexDirection: "column",
                position: "relative",
                height: "100%",
                width: "100%",
                backgroundColor: theme.palette.background.default,

                "& .react-flow__node": {
                    border: "1px solid divider",
                },

                "& .react-flow__panel, & .react-flow__controls-button": {
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                },

                "& .react-flow__panel": {
                    border: "1px solid divider",
                },

                "& .react-flow__controls-button": {
                    borderBottom: "1px solid divider",
                    fill: theme.palette.text.primary,
                },
            }}
        >
            <Box
                id={`${id}-react-flow-wrapper`}
                ref={flowWrapperRef}
                sx={{
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    minHeight: 0,
                    position: "relative",
                    pt: theme.spacing(4),
                }}
            >
                {getTitle()}
                <ReactFlow
                    connectionMode={ConnectionMode.Loose}
                    edgeTypes={edgeTypes}
                    edges={edges}
                    fitView={true}
                    id={`${id}-react-flow`}
                    nodeTypes={nodeTypes}
                    nodes={nodes}
                    nodesDraggable={!isAgentNetworkDesignerMode}
                    onKeyDown={handleNodeKeyDown}
                    onNodeClick={handleNodeClick}
                    onNodesChange={onNodesChange}
                >
                    {!isAwaitingLlm && (
                        <>
                            {agentsInNetwork?.length && !isAgentNetworkDesignerMode && !isEditingNetwork
                                ? getLegend()
                                : null}
                            <Background id={`${id}-background`} />
                            {!isAgentNetworkDesignerMode && !isEditingNetwork && getControls()}
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
            {isTemporaryNetwork && !isAwaitingLlm && (
                <NetworkEditorDock
                    currentUser={currentUser}
                    id={`${id}-network-editor-dock`}
                    isEditingNetwork={isEditingNetwork}
                    networkId={networkId}
                    neuroSanURL={neuroSanURL}
                    setIsEditingNetwork={setIsEditingNetwork}
                    setSelectedNetwork={setSelectedNetwork}
                    tempNetworks={tempNetworks}
                />
            )}
            {selectedAgent && !isAwaitingLlm && (
                <AgentNodeEditor
                    agentId={selectedAgent.agentId}
                    agentName={selectedAgent.agentName}
                    initialInstructions={selectedAgent.initialInstructions}
                    initialDescription={selectedAgent.initialDescription}

                    isOpen={isPopupOpen}
                    networkId={networkId}
                    onSaveAgent={onSaveAgent}
                    setIsPopupOpen={setIsPopupOpen}
                />
            )}
        </Box>
    )
}

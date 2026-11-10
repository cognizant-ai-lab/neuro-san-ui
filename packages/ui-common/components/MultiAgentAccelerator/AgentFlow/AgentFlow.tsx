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
import {
    applyNodeChanges,
    Background,
    BackgroundVariant,
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
import {NetworkHud, NetworkHudStatus} from "./NetworkHud"
import {PlasmaEdge} from "./PlasmaEdge"
import {AgentIconSuggestions} from "../../../controller/Types/AgentIconSuggestions"
import {ConnectivityInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {useEnvironmentStore} from "../../../state/Environment"
import {usePublishServerUrl} from "../../../state/Publish"
import {GraphColoringOption, Layout, usePalette, useSettingsStore} from "../../../state/Settings"
import {useTempNetworksStore} from "../../../state/TemporaryNetworks"
import {
    auroraBackground,
    getSheen,
    glassSurface,
    gradientBorder,
    GRAIN_TEXTURE,
    SHEEN_EASE,
    SHEEN_RADIUS_SURFACE,
} from "../../../Theme/sheen"
import {getZIndex} from "../../../utils/zIndexLayers"
import {AgentNodeEditor} from "../Editor/AgentNodeEditor"
import {NetworkEditorDock} from "../Editor/NetworkEditorDock"
import {PublishButton} from "../Publish/PublishButton"
import {isEditableAgent} from "../TemporaryNetworks"
import {ThoughtBubbleEdge, ThoughtBubbleEdgeShape} from "../ThoughtBubbles/ThoughtBubbleEdge"
import {ThoughtBubbleOverlay} from "../ThoughtBubbles/ThoughtBubbleOverlay"

//#region: Types

/**
 * Insets (px) of the part of the canvas that is not covered by floating UI (side panels, navbar). The canvas itself
 * is full-bleed; the HUD, toolbar, thought bubbles and fit-view framing are kept inside this "safe area".
 */
export interface CanvasSafeArea {
    readonly top: number
    readonly right: number
    readonly bottom: number
    readonly left: number
}

export interface AgentFlowProps {
    readonly agentCounts?: Map<string, number>
    readonly agentIconSuggestions?: AgentIconSuggestions
    readonly agentsInNetwork: ConnectivityInfo[]
    readonly currentConversations?: AgentConversation[] | null
    readonly currentUser?: string
    /**
     * Extra sly_data entries to merge into each outgoing request. For example, API keys for BYOK.
     */
    readonly extraSlyData?: Record<string, unknown>
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
     * Region of the canvas left uncovered by floating panels. Defaults to the whole canvas.
     */
    readonly safeArea?: CanvasSafeArea
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

const NO_INSETS: CanvasSafeArea = {top: 0, right: 0, bottom: 0, left: 0}

// Gap between the safe-area edge and the floating HUD / toolbar (px)
const FLOATING_GAP = 12

// Extra room reserved above and below the graph for the HUD and toolbar when fitting the view (px)
const HUD_CLEARANCE = 64
const TOOLBAR_CLEARANCE = 72

// Duration of animated fit-view transitions (ms)
const FIT_VIEW_DURATION_MS = 550

// Specular highlight for the legend's color dots (same glossy look as the agent nodes)
const LEGEND_DOT_SPECULAR = "radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0) 55%)"

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
    extraSlyData,
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
    safeArea = NO_INSETS,
    thoughtBubbleEdges,
    setIsEditingNetwork,
    setSelectedNetwork,
    setThoughtBubbleEdges,
}) => {
    const theme = useTheme()
    // CSS-variable references when available, so colors follow the active color scheme
    const themeVars = theme.vars ?? theme

    // Default (non-plasma) edges: the accent color at reduced strength, so active plasma edges stand out
    const edgeColor = `color-mix(in srgb, ${themeVars.palette.primary.main} 45%, transparent)`

    const {fitView} = useReactFlow()
    const flowWrapperRef = useRef<HTMLDivElement | null>(null)
    const fitViewFrameRef = useRef<number | null>(null)

    const enablePublishing = useEnvironmentStore((state) => state.enablePublishing)

    // Frame the graph inside the safe area, leaving room for the HUD (top) and toolbar (bottom)
    const {top: safeTop, right: safeRight, bottom: safeBottom, left: safeLeft} = safeArea
    const fitViewOptions = useMemo(
        () => ({
            duration: FIT_VIEW_DURATION_MS,
            padding: {
                top: `${safeTop + HUD_CLEARANCE}px` as const,
                right: `${safeRight + FLOATING_GAP * 2}px` as const,
                bottom: `${safeBottom + TOOLBAR_CLEARANCE}px` as const,
                left: `${safeLeft + FLOATING_GAP * 2}px` as const,
            },
        }),
        [safeBottom, safeLeft, safeRight, safeTop]
    )

    const scheduleFitView = useCallback(() => {
        if (fitViewFrameRef.current !== null) {
            window.cancelAnimationFrame(fitViewFrameRef.current)
        }

        fitViewFrameRef.current = window.requestAnimationFrame(() => {
            fitViewFrameRef.current = null
            void fitView(fitViewOptions)
        })
    }, [fitView, fitViewOptions])

    // Horizontal offset (px) of the safe area's center from the canvas center: floating chrome is centered on it
    const safeCenterOffset = (safeLeft - safeRight) / 2

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

    const publishServerUrl = usePublishServerUrl()

    const currentTempNetwork = useMemo(
        () => (networkId ? tempNetworks.find((n) => n.agentInfo.agent_name === networkId) : undefined),
        [networkId, tempNetworks]
    )

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
            const currentAgentDefinition = currentTempNetwork?.agentNetworkDefinition?.find((e) => e.origin === node.id)

            setSelectedAgent({
                agentId: node.id,
                agentName: node.data.agentName,
                initialInstructions: currentAgentDefinition?.instructions ?? "",
                initialDescription: currentAgentDefinition?.description ?? "",
            })
            setIsPopupOpen(true)
        },
        [currentTempNetwork, isTemporaryNetwork]
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
                stroke={themeVars.palette.primary.main}
                strokeDasharray="2 7"
                strokeLinecap="round"
                fill="none"
                opacity="0.35"
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
                    // Lives inside the floating toolbar, after the view controls
                    alignItems: "center",
                    display: "flex",
                    paddingLeft: theme.spacing(0.25),
                    paddingRight: theme.spacing(0.5),
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
                            // Same glossy shading as the agent nodes
                            backgroundImage: LEGEND_DOT_SPECULAR,
                            borderRadius: "50%",
                            boxShadow: "inset 0 -1px 2px rgba(0, 0, 0, 0.25)",
                            color: theme.palette.getContrastText(palette[i]),
                            display: "flex",
                            fontSize: "0.5rem",
                            justifyContent: "center",
                            height: "15px",
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
                        marginLeft: theme.spacing(1.25),
                        "& .MuiToggleButton-root": {
                            borderColor: getSheen(theme).glassBorder,
                            color: themeVars.palette.text.secondary,
                            minHeight: 24,
                            px: 1.1,
                            "&:hover": {
                                backgroundColor: themeVars.palette.action.hover,
                            },
                            "&.Mui-selected, &.Mui-selected:hover": {
                                backgroundColor: getSheen(theme).tint,
                                borderColor: themeVars.palette.primary.main,
                                color: themeVars.palette.text.primary,
                            },
                        },
                    }}
                >
                    <ToggleButton
                        id={`${id}-depth-toggle`}
                        value="depth"
                        sx={{
                            fontSize: "0.55rem",
                            height: "1.2rem",
                        }}
                    >
                        Depth
                    </ToggleButton>
                    <ToggleButton
                        id={`${id}-heatmap-toggle`}
                        value="heatmap"
                        sx={{
                            fontSize: "0.55rem",
                            height: "1.2rem",
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
        return isActive ? getSheen(theme).tint : undefined
    }

    // Only show radial guides if radial layout is selected, radial guides are enabled, and it's not just Frontman
    const shouldShowRadialGuides = showRadialGuides && layout === "radial" && maxDepth > 1

    // The coloring legend rides along in the toolbar once there are agents to color
    const showLegend = agentsInNetwork?.length > 0

    // Floating top-center HUD: network name, live status, agent count, plus the Edit / Publish actions
    const getHud = () => {
        if (!networkDisplayName) return null

        const isPublishingSetUp = enablePublishing && Boolean(publishServerUrl)
        const hoconToPublish = currentTempNetwork?.networkHocon
        const showPublishButton =
            isPublishingSetUp && !isAgentNetworkDesignerMode && currentTempNetwork?.agentNetworkName && hoconToPublish

        let hudStatus: NetworkHudStatus = "idle"
        if (isAwaitingLlm) {
            hudStatus = currentConversations?.length ? "streaming" : "thinking"
        }

        return (
            <NetworkHud
                agentCount={agentsInNetwork?.length ?? 0}
                centerOffset={safeCenterOffset}
                id={id}
                networkDisplayName={networkDisplayName}
                status={hudStatus}
                top={safeTop + FLOATING_GAP}
            >
                {isTemporaryNetwork && !isEditingNetwork && !isAwaitingLlm && (
                    <Button
                        id={`${id}-enter-edit-mode-btn`}
                        variant="contained"
                        size="small"
                        onClick={() => setIsEditingNetwork(true)}
                        startIcon={<EditIcon />}
                        sx={{borderRadius: 999, pointerEvents: "auto"}}
                    >
                        Edit
                    </Button>
                )}
                {showPublishButton && (
                    <Box sx={{pointerEvents: "auto"}}>
                        <PublishButton
                            displayName={networkDisplayName}
                            hocon={hoconToPublish}
                            id={`${id}-publish-button`}
                            networkId={currentTempNetwork.agentInfo.agent_name}
                            networkName={currentTempNetwork.agentNetworkName}
                        />
                    </Box>
                )}
            </NetworkHud>
        )
    }

    // Thin vertical rule between groups of buttons in the toolbar
    const getToolbarDivider = (key: string) => (
        <Box
            aria-hidden={true}
            key={key}
            sx={{
                alignSelf: "stretch",
                backgroundColor: getSheen(theme).glassBorder,
                marginX: theme.spacing(0.5),
                marginY: theme.spacing(0.5),
                width: "1px",
            }}
        />
    )

    // Floating bottom-center toolbar ("glass pill"): zoom / fit view / lock (built into Controls), then the layout,
    // radial guides and thought bubble toggles, then the coloring legend.
    const getControls = () => {
        return (
            <Controls
                aria-label="Control Panel"
                fitViewOptions={fitViewOptions}
                orientation="horizontal"
                position="bottom-center"
                style={{
                    bottom: `${safeBottom + FLOATING_GAP}px`,
                    left: `calc(50% + ${safeCenterOffset}px)`,
                }}
                showInteractive={true}
            >
                {getToolbarDivider("view-divider")}
                <Tooltip
                    id="radial-layout-tooltip"
                    title="Radial layout"
                    placement="top"
                >
                    <span id="radial-layout-span">
                        <ControlButton
                            aria-label="Radial layout"
                            aria-pressed={layout === "radial"}
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
                    placement="top"
                >
                    <span id="linear-layout-span">
                        <ControlButton
                            aria-label="Linear layout"
                            aria-pressed={layout === "linear"}
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
                    placement="top"
                >
                    <span id="radial-guides-span">
                        <ControlButton
                            aria-label="Radial guides"
                            aria-pressed={showRadialGuides}
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
                    placement="top"
                >
                    <span id="thought-bubble-span">
                        <ControlButton
                            aria-label="Thought bubbles"
                            aria-pressed={showThoughtBubbles}
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
                {showLegend && getToolbarDivider("legend-divider")}
                {showLegend && getLegend()}
            </Controls>
        )
    }

    const sheen = getSheen(theme)

    return (
        <Box
            id={`${id}-outer-box`}
            sx={{
                display: "flex",
                flexDirection: "column",
                position: "relative",
                height: "100%",
                width: "100%",
                overflow: "hidden",
                backgroundColor: themeVars.palette.background.default,
                backgroundImage: auroraBackground(theme),

                // Vignette + film grain over the aurora: pulls the eye to the middle of the canvas
                "&::before": {
                    backgroundImage: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, ${alpha(
                        theme.palette.background.default,
                        0.85
                    )})`,
                    content: '""',
                    inset: 0,
                    pointerEvents: "none",
                    position: "absolute",
                    zIndex: 0,
                },
                "&::after": {
                    backgroundImage: GRAIN_TEXTURE,
                    content: '""',
                    inset: 0,
                    mixBlendMode: "overlay",
                    opacity: 0.18,
                    pointerEvents: "none",
                    position: "absolute",
                    zIndex: 0,
                },

                // Default (non-plasma) edges: translucent accent with a soft glow. Arrow markers match via
                // defaultMarkerColor. Plasma edges draw their own glow.
                "--xy-edge-stroke": edgeColor,
                "& .react-flow__edge-default .react-flow__edge-path": {
                    filter: `drop-shadow(0 0 3px ${sheen.glow})`,
                    strokeLinecap: "round",
                },

                // Nodes are custom (glass discs + name pill); no wrapper chrome
                "& .react-flow__node": {
                    border: "none",
                },

                "& .react-flow__panel, & .react-flow__controls-button": {
                    color: themeVars.palette.text.primary,
                },

                // Toolbar: a floating glass pill centered under the graph
                "& .react-flow__controls": {
                    ...glassSurface(theme, 999),
                    ...gradientBorder(theme, 999, 1, 0.35),
                    // gradientBorder sets position: relative; React Flow panels must stay absolutely positioned
                    position: "absolute",
                    alignItems: "center",
                    animation: `sheenRise 0.6s ${SHEEN_EASE} both`,
                    border: 0,
                    boxShadow: `inset 0 1px 0 ${sheen.highlight}, 0 18px 50px -18px rgba(0, 0, 0, 0.6)`,
                    gap: "2px",
                    margin: 0,
                    padding: theme.spacing(0.5),
                    // Center with `translate` rather than `transform`: the sheenRise entrance animates transform and
                    // would otherwise wipe out the centering offset
                    transform: "none",
                    translate: "-50% 0",
                    transition: `left 0.55s ${SHEEN_EASE}, bottom 0.55s ${SHEEN_EASE}`,
                },

                "& .react-flow__controls-button": {
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "50%",
                    fill: themeVars.palette.text.primary,
                    height: 30,
                    transition: `background-color 0.2s ${SHEEN_EASE}, box-shadow 0.2s ${SHEEN_EASE}`,
                    width: 30,
                    "& svg": {maxHeight: 16, maxWidth: 16},
                    "&:hover": {backgroundColor: sheen.tint, boxShadow: `0 0 14px -4px ${sheen.glow}`},
                    "&:focus-visible": {outline: `2px solid ${themeVars.palette.primary.main}`, outlineOffset: 1},
                },

                // Dot grid: soft accent dots
                "& .react-flow__background circle, & .react-flow__background path": {
                    opacity: 0.9,
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
                    zIndex: 1,
                }}
            >
                {getHud()}
                <ReactFlow
                    connectionMode={ConnectionMode.Loose}
                    defaultMarkerColor={edgeColor}
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
                            <Background
                                gap={22}
                                id={`${id}-background`}
                                size={1.4}
                                variant={BackgroundVariant.Dots}
                            />
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
                    rightInset={safeRight}
                    topInset={safeTop}
                />
            </Box>
            {isTemporaryNetwork && !isAwaitingLlm && (
                // Floating glass card for the editor dock, kept inside the safe area. Hidden while the dock is closed.
                <Box
                    id={`${id}-network-editor-dock-card`}
                    sx={{
                        borderRadius: `${SHEEN_RADIUS_SURFACE}px`,
                        bottom: `${safeBottom + FLOATING_GAP}px`,
                        boxShadow: `0 24px 60px -20px rgba(0, 0, 0, 0.6), 0 0 0 1px ${sheen.glassBorder}`,
                        left: `${safeLeft + FLOATING_GAP}px`,
                        overflow: "hidden",
                        position: "absolute",
                        right: `${safeRight + FLOATING_GAP}px`,
                        transition: `left 0.55s ${SHEEN_EASE}, right 0.55s ${SHEEN_EASE}`,
                        zIndex: getZIndex(2, theme),
                        "&:empty": {display: "none"},
                    }}
                >
                    <NetworkEditorDock
                        currentUser={currentUser}
                        extraSlyData={extraSlyData}
                        id={`${id}-network-editor-dock`}
                        isEditingNetwork={isEditingNetwork}
                        networkId={networkId}
                        neuroSanURL={neuroSanURL}
                        setIsEditingNetwork={setIsEditingNetwork}
                        setSelectedNetwork={setSelectedNetwork}
                        tempNetworks={tempNetworks}
                    />
                </Box>
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

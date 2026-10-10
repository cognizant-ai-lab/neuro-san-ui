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

import Box from "@mui/material/Box"
import {useTheme} from "@mui/material/styles"
import {
    applyNodeChanges,
    Background,
    ConnectionMode,
    EdgeTypes,
    NodeChange,
    NodeMouseHandler,
    ReactFlow,
    Node as RFNode,
    NodeTypes as RFNodeTypes,
    useReactFlow,
    useStore,
} from "@xyflow/react"
import {FC, KeyboardEventHandler, useCallback, useEffect, useMemo, useRef, useState} from "react"

import {AgentConversation} from "../AgentConversations"
import {AgentNode, AgentNodeProps, NODE_HEIGHT, NODE_WIDTH} from "./AgentNode"
import {
    AgentNetworkDefinitionEntry,
    BASE_RADIUS,
    DEFAULT_FRONTMAN_X_POS,
    DEFAULT_FRONTMAN_Y_POS,
    LEVEL_SPACING,
} from "../const"
import {CustomControls} from "./CustomControls"
import {layoutLinear, layoutRadial, LayoutResult} from "./GraphLayouts"
import {Legend} from "./Legend"
import {PlasmaEdge} from "./PlasmaEdge"
import {Title} from "./Title"
import {AgentIconSuggestions} from "../../../controller/Types/AgentIconSuggestions"
import {ConnectivityInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {useSettingsStore} from "../../../state/Settings"
import {useTempNetworksStore} from "../../../state/TemporaryNetworks"
import {AgentNodeEditor} from "../Editor/AgentNodeEditor"
import {NetworkEditorDock} from "../Editor/NetworkEditorDock"
import {isEditableAgent} from "../TemporaryNetworks"
import {ThoughtBubbles} from "../ThoughtBubbles/ThoughtBubbles"

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
}

//#endregion: Types

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
    setIsEditingNetwork,
    setSelectedNetwork,
}) => {
    if (currentConversations && currentConversations.length > 0) {
        console.debug(`AgentFlow: Rendering ${currentConversations.length} conversations`, currentConversations)
    }

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

    const layout = useSettingsStore((state) => state.settings.appearance.layout)

    const graphColoringOption = useSettingsStore((state) => state.settings.appearance.graphColoringOption)

    const showRadialGuides = useSettingsStore((state) => state.settings.appearance.showRadialGuides)
    const showThoughtBubbles = useSettingsStore((state) => state.settings.appearance.showThoughtBubbles)

    // Read temporary networks to find agent_network_definition for the currently selected network.
    const tempNetworks = useTempNetworksStore((state) => state.tempNetworks)

    // Ref for isStreaming, read inside the cleanup interval.
    const isStreamingRef = useRef<boolean | undefined>(isStreaming)

    // Display option for agent/network names
    const useNativeNames = useSettingsStore((state) => state.settings.appearance.useNativeNames)

    // Keep the ref current after every render.
    useEffect(() => {
        isStreamingRef.current = isStreaming
    })

    const isHeatmap = graphColoringOption === "heatmap"

    // Create the flow layout depending on user preference
    // Memoize layoutResult so it only recalculates when relevant data changes
    const layoutResult: LayoutResult = useMemo(() => {
        if (agentsInNetwork.length > 0) {
            return layout === "linear"
                ? layoutLinear({
                      agentCounts: isHeatmap ? agentCounts : undefined,
                      agentIconSuggestions,
                      agentsInNetwork,
                      currentConversations,
                      isAgentNetworkDesignerMode,
                      isAwaitingLlm,
                      isTemporaryNetwork,
                      useNativeNames,
                  })
                : layoutRadial({
                      agentCounts: isHeatmap ? agentCounts : undefined,
                      agentIconSuggestions,
                      agentsInNetwork,
                      currentConversations,
                      isAgentNetworkDesignerMode,
                      isAwaitingLlm,
                      isTemporaryNetwork,
                      useNativeNames,
                  })
        } else {
            return {nodes: [], edges: []}
        }
    }, [
        agentCounts,
        agentIconSuggestions,
        agentsInNetwork,
        currentConversations,
        isAgentNetworkDesignerMode,
        isAwaitingLlm,
        isHeatmap,
        isTemporaryNetwork,
        layout,
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

    // Only show radial guides if radial layout is selected, radial guides are enabled, and it's not just Frontman
    const shouldShowRadialGuides = showRadialGuides && layout === "radial" && maxDepth > 1

    // Only show edit button for temporary networks where we're not already editing and not awaiting LLM response
    const showEditButton = isTemporaryNetwork && !isEditingNetwork && !isAwaitingLlm

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
                <Title
                    id={`${id}-network-title-bar`}
                    networkDisplayName={networkDisplayName}
                    setIsEditingNetwork={setIsEditingNetwork}
                    showEditButton={showEditButton}
                />
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
                            {agentsInNetwork?.length && !isAgentNetworkDesignerMode && !isEditingNetwork && (
                                <Legend
                                    id="legend"
                                    maxDepth={maxDepth}
                                />
                            )}
                            <Background id={`${id}-background`} />
                            {!isAgentNetworkDesignerMode && !isEditingNetwork && <CustomControls />}
                            {shouldShowRadialGuides ? getRadialGuides() : null}
                        </>
                    )}
                </ReactFlow>
                {showThoughtBubbles && <ThoughtBubbles currentConversations={currentConversations} />}
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

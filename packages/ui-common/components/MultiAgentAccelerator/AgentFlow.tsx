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
import CloseIcon from "@mui/icons-material/Close"
import EditIcon from "@mui/icons-material/Edit"
import HubOutlinedIcon from "@mui/icons-material/HubOutlined"
import ScatterPlotOutlinedIcon from "@mui/icons-material/ScatterPlotOutlined"
import Backdrop from "@mui/material/Backdrop"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import Paper from "@mui/material/Paper"
import {alpha, useTheme} from "@mui/material/styles"
import TextField from "@mui/material/TextField"
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
import {Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useRef, useState} from "react"

import {AgentConversation} from "./AgentConversations"
import {AgentNode, AgentNodeProps, NODE_HEIGHT, NODE_WIDTH} from "./AgentNode"
import {AgentNodePopup} from "./AgentNodePopup"
import {
    AGENT_NETWORK_DEFINITION_KEY,
    AGENT_NETWORK_DESIGNER_ID,
    AGENT_NETWORK_NAME_KEY,
    AgentNetworkDefinitionEntry,
    BASE_RADIUS,
    DEFAULT_FRONTMAN_X_POS,
    DEFAULT_FRONTMAN_Y_POS,
    LEVEL_SPACING,
} from "./const"
import {addThoughtBubbleEdge, layoutLinear, layoutRadial, LayoutResult} from "./GraphLayouts"
import {PlasmaEdge} from "./PlasmaEdge"
import {
    convertReservationsToNetworks,
    extractNetworkHocon,
    extractReservations,
    isEditableAgent,
    mergeNetworks,
} from "./TemporaryNetworks"
import {ThoughtBubbleEdge, ThoughtBubbleEdgeShape} from "./ThoughtBubbleEdge"
import {ThoughtBubbleOverlay} from "./ThoughtBubbleOverlay"
import {sendChatQuery} from "../../controller/agent/Agent"
import {StreamingUnit} from "../../controller/llm/LlmChat"
import {AgentIconSuggestions} from "../../controller/Types/AgentIconSuggestions"
import {ConnectivityInfo} from "../../generated/neuro-san/NeuroSanClient"
import {useAgentChatHistoryStore} from "../../state/ChatHistory"
import {TemporaryNetwork, useTempNetworksStore} from "../../state/TemporaryNetworks"
import {usePalette} from "../../Theme/Palettes"
import {getZIndex} from "../../utils/zIndexLayers"
import {chatMessageFromChunk} from "../AgentChat/Common/Utils"
import {NotificationType, sendNotification} from "../Common/notification"
// #region: Types
export interface AgentFlowProps {
    readonly agentCounts?: Map<string, number>
    readonly agentIconSuggestions?: AgentIconSuggestions
    readonly agentsInNetwork: ConnectivityInfo[]
    readonly currentConversations?: AgentConversation[] | null
    readonly currentUser?: string
    readonly id: string
    readonly isAwaitingLlm?: boolean
    readonly isAgentNetworkDesignerMode?: boolean
    readonly isEditMode?: boolean
    readonly isStreaming?: boolean
    readonly isSelectedNetworkTemporary?: boolean
    /** The history key for the currently selected network (used to scope sly_data reads/writes per network). */
    readonly networkId?: string
    readonly neuroSanURL?: string
    /**
     * Called after a popup save triggers a new network reservation that replaces the currently viewed network.
     * @param oldNetworkId The agent_name of the network that was replaced.
     * @param newNetworkId The agent_name of the replacement network to navigate to.
     */
    readonly networkDisplayName?: string
    readonly onEnterEditMode?: () => void
    readonly onNetworkReplaced?: (oldNetworkId: string, newNetworkId: string) => void
    /** Called when the user closes the edit-mode dock. */
    readonly onExitEditMode?: () => void
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

type Layout = "radial" | "linear"

// #endregion: Types

// #region: Constants

// Timeout for thought bubbles is set to 10 seconds
const THOUGHT_BUBBLE_TIMEOUT_MS = 10_000

// #endregion: Constants

const DOCK_PROMPT_PLACEHOLDER = "Describe a change to the network"

// #region: Helpers

/**
 * Streams the Agent Network Designer endpoint with a natural-language prompt and the current
 * network definition, collecting any returned reservations.
 */
const streamNetworkDesignerPrompt = async (
    neuroSanURL: string,
    signal: AbortSignal,
    userPrompt: string,
    currentDefinition: AgentNetworkDefinitionEntry[],
    agentNetworkName: string | undefined,
    currentUser: string
): Promise<TemporaryNetwork[]> => {
    let newNetworks: TemporaryNetwork[] = []

    await sendChatQuery(
        neuroSanURL,
        signal,
        userPrompt,
        AGENT_NETWORK_DESIGNER_ID,
        (chunk: string) => {
            const chatMessage = chatMessageFromChunk(chunk)
            if (!chatMessage) return

            const reservations = extractReservations(chatMessage)
            if (reservations.length === 0) return

            const networkHocon = extractNetworkHocon(chatMessage)
            const agentNetworkNameFromMessage = chatMessage.sly_data?.[AGENT_NETWORK_NAME_KEY] as string | undefined
            const networkName = agentNetworkName ?? agentNetworkNameFromMessage

            const definitionFromMessage = chatMessage.sly_data?.[AGENT_NETWORK_DEFINITION_KEY] as
                | AgentNetworkDefinitionEntry[]
                | undefined

            const converted = convertReservationsToNetworks(
                reservations,
                networkHocon,
                definitionFromMessage ?? currentDefinition,
                networkName
            )
            newNetworks = mergeNetworks(newNetworks, converted)
        },
        null,
        {
            [AGENT_NETWORK_DEFINITION_KEY]: currentDefinition,
            ...(agentNetworkName ? {[AGENT_NETWORK_NAME_KEY]: agentNetworkName} : {}),
        },
        currentUser,
        StreamingUnit.Line
    )

    return newNetworks
}

// #endregion: Helpers

export const AgentFlow: FC<AgentFlowProps> = ({
    agentCounts,
    agentIconSuggestions,
    agentsInNetwork,
    currentConversations,
    currentUser,
    id,
    isAgentNetworkDesignerMode,
    isAwaitingLlm,
    isEditMode,
    isStreaming,
    isSelectedNetworkTemporary: isTemporaryNetwork,
    networkDisplayName,
    networkId,
    neuroSanURL,
    onEnterEditMode,
    onNetworkReplaced,
    onExitEditMode,
    onSaveAgent,
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

    // Read temporary networks to find agent_network_definition for the currently selected network.
    const tempNetworks = useTempNetworksStore((state) => state.tempNetworks)
    const updateTempNetworkDefinition = useTempNetworksStore((state) => state.updateTempNetworkDefinition)

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
        const missing = [...bubbleAgentIds].filter((bubbleAgentId) => !existingIds.has(bubbleAgentId))
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
                      agentIconSuggestions,
                      isTemporaryNetwork
                  )
                : layoutRadial(
                      isHeatmap ? agentCounts : undefined,
                      mergedAgentsInNetwork,
                      currentConversations,
                      isAwaitingLlm,
                      isAgentNetworkDesignerMode,
                      thoughtBubbleEdges,
                      agentIconSuggestions,
                      isTemporaryNetwork
                  ),
        [
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
        ]
    )

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

    // True while the agent-edit request is in-flight so we can disable the Save button.
    const [isSavingAgent, setIsSavingAgent] = useState<boolean>(false)

    // AbortController for the in-flight save request — stored in a ref so handlePopupClose can cancel it.
    const saveAbortControllerRef = useRef<AbortController | null>(null)

    // Dock (edit-mode prompt bar) state
    const [dockPrompt, setDockPrompt] = useState<string>("")
    const [isDockStreaming, setIsDockStreaming] = useState<boolean>(false)
    const dockAbortControllerRef = useRef<AbortController | null>(null)

    const handleNodeClick: NodeMouseHandler<RFNode<AgentNodeProps>> = useCallback(
        (_event, node) => {
            // Popup is only available for temporary networks.
            if (!isTemporaryNetwork) return

            // Only llm_agent nodes support instructions/description editing.
            if (!isEditableAgent(node.data.displayAs)) return

            // Find the clicked agent's existing instructions and description from the temp network definition.
            const currentTempNetwork = networkId
                ? tempNetworks.find((n) => n.agentInfo.agent_name === networkId)
                : undefined
            const found = (currentTempNetwork?.agentNetworkDefinition ?? []).find((e) => e.origin === node.id)

            setSelectedAgent({
                agentId: node.id,
                agentName: node.data.agentName,
                initialInstructions: found?.instructions ?? "",
                initialDescription: found?.description ?? "",
            })
            setIsPopupOpen(true)
        },
        [tempNetworks, isTemporaryNetwork, networkId]
    )

    const handlePopupClose = useCallback(() => {
        // If a save is in-flight, abort it immediately so the stream doesn't hang.
        saveAbortControllerRef.current?.abort()
        saveAbortControllerRef.current = null
        setIsPopupOpen(false)
        setIsSavingAgent(false)
    }, [])

    /** Applies the networks returned by the designer: upserts them and triggers navigation if needed. */
    const applyNetworkSaveResult = useCallback(
        (agentName: string, newNetworksFromSave: TemporaryNetwork[], currentAgentNetworkName: string | undefined) => {
            if (newNetworksFromSave.length === 0) {
                sendNotification(
                    NotificationType.error,
                    `Failed to update network "${agentName}".`,
                    "The network designer did not return a reservation. Please try again."
                )
                return
            }

            const replacement = newNetworksFromSave.find((n) => n.agentNetworkName === currentAgentNetworkName)
            if (replacement) {
                useTempNetworksStore.getState().upsertTempNetworks(newNetworksFromSave)
                if (networkId && onNetworkReplaced) {
                    useAgentChatHistoryStore.getState().copyHistory(networkId, replacement.agentInfo.agent_name)
                    onNetworkReplaced(networkId, replacement.agentInfo.agent_name)
                }
            } else {
                // Reservations came back but none matched the current network — surface this to the user.
                sendNotification(
                    NotificationType.error,
                    `Failed to update network "${agentName}".`,
                    "A reservation was returned but did not match the current network. Please try again."
                )
            }
        },
        [networkId, onNetworkReplaced]
    )

    const handleDockApply = useCallback(async () => {
        if (!dockPrompt.trim() || !neuroSanURL || !currentUser) return

        const currentTempNetwork = networkId
            ? tempNetworks.find((n) => n.agentInfo.agent_name === networkId)
            : undefined
        const currentDefinition = currentTempNetwork?.agentNetworkDefinition ?? []

        setIsDockStreaming(true)
        const controller = new AbortController()
        dockAbortControllerRef.current = controller
        let hasTimedOut = false
        const timeoutId = setTimeout(() => {
            hasTimedOut = true
            controller.abort()
        }, 120_000) // 2 min timeout
        try {
            const newNetworks = await streamNetworkDesignerPrompt(
                neuroSanURL,
                controller.signal,
                dockPrompt,
                currentDefinition,
                currentTempNetwork?.agentNetworkName,
                currentUser
            )
            applyNetworkSaveResult(dockPrompt, newNetworks, currentTempNetwork?.agentNetworkName)
            setDockPrompt("")
        } catch (e: unknown) {
            const isAbort = e instanceof DOMException && e.name === "AbortError"
            if (!isAbort) {
                sendNotification(NotificationType.error, "Failed to apply network change.", String(e), undefined, null)
            } else if (hasTimedOut) {
                sendNotification(
                    NotificationType.error,
                    "Failed to apply network change.",
                    "The request timed out. Please try again.",
                    undefined,
                    null // show indefinitely until the user dismisses
                )
            }
        } finally {
            clearTimeout(timeoutId)
            dockAbortControllerRef.current = null
            setIsDockStreaming(false)
        }
    }, [applyNetworkSaveResult, currentUser, dockPrompt, networkId, neuroSanURL, tempNetworks])

    const handleExitEditMode = useCallback(() => {
        if (isDockStreaming) {
            dockAbortControllerRef.current?.abort()
            dockAbortControllerRef.current = null
            setIsDockStreaming(false)
        }
        onExitEditMode?.()
    }, [isDockStreaming, onExitEditMode])

    const handlePopupSave = useCallback(
        async (agentName: string, instructionsText: string, descriptionText: string) => {
            if (!selectedAgent) return

            // Find the temp network entry for the currently selected network.
            const currentTempNetwork = networkId
                ? tempNetworks.find((n) => n.agentInfo.agent_name === networkId)
                : undefined

            // Produce a new array with the saved agent's fields updated; all other entries pass through unchanged.
            const currentDefinitions = currentTempNetwork?.agentNetworkDefinition ?? []
            const updated = currentDefinitions.map((entry) =>
                entry.origin === selectedAgent.agentId
                    ? {...entry, instructions: instructionsText, description: descriptionText}
                    : entry
            )
            if (networkId) {
                updateTempNetworkDefinition(networkId, updated)
            }

            if (!onSaveAgent) {
                setIsPopupOpen(false)
                return
            }

            setIsSavingAgent(true)
            const saveController = new AbortController()
            saveAbortControllerRef.current = saveController
            const saveTimeoutId = setTimeout(
                () => saveController.abort(new DOMException("Save timed out", "TimeoutError")),
                60_000 // 1 min timeout
            )
            try {
                await onSaveAgent(agentName, updated, currentTempNetwork?.agentNetworkName, saveController.signal)
            } catch (e) {
                console.error(`Error saving network ${agentName}. See onSaveAgent implementation for details.`, e)
                sendNotification(
                    NotificationType.error,
                    `Failed to save agent "${agentName}".`,
                    String(e),
                    undefined,
                    null // show indefinitely until the user dismisses
                )
            } finally {
                clearTimeout(saveTimeoutId)
                saveAbortControllerRef.current = null
                setIsSavingAgent(false)
                setIsPopupOpen(false)
            }
        },
        [selectedAgent, tempNetworks, updateTempNetworkDefinition, networkId, onSaveAgent]
    )

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
                            <ChatBubbleOutlinedIcon id="thought-bubble-icon" />
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
                display: "flex",
                flexDirection: "column",
                position: "relative",
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
            <Box
                id={`${id}-react-flow-wrapper`}
                sx={{position: "relative", flex: 1, minHeight: 0}}
            >
                {networkDisplayName && (
                    <Box
                        id={`${id}-network-title-bar`}
                        sx={{
                            position: "absolute",
                            top: 44,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: getZIndex(1, theme),
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            pointerEvents: "none",
                        }}
                    >
                        <Typography
                            id={`${id}-network-title`}
                            variant="subtitle1"
                            sx={{
                                fontWeight: "bold",
                                backgroundColor: alpha(theme.palette.background.paper, 0.85),
                                borderRadius: 1.5,
                                color:
                                    theme.palette.mode === "dark"
                                        ? theme.palette.common.white
                                        : theme.palette.text.primary,
                                px: 1.5,
                                py: 0.25,
                                whiteSpace: "nowrap",
                                maxWidth: 400,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {networkDisplayName}
                        </Typography>
                        {isTemporaryNetwork && !isEditMode && !isAwaitingLlm && onEnterEditMode && (
                            <Button
                                id={`${id}-enter-edit-mode-btn`}
                                variant="contained"
                                size="small"
                                onClick={onEnterEditMode}
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
                )}
                <ReactFlow
                    id={`${id}-react-flow`}
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onNodeClick={handleNodeClick}
                    fitView={true}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    connectionMode={ConnectionMode.Loose}
                >
                    {!isAwaitingLlm && (
                        <>
                            {agentsInNetwork?.length && !isAgentNetworkDesignerMode && !isEditMode ? getLegend() : null}
                            <Background id={`${id}-background`} />
                            {!isAgentNetworkDesignerMode && !isEditMode && getControls()}
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
            {isEditMode && isTemporaryNetwork && !isAwaitingLlm && (
                <Box
                    id={`${id}-topology-editor-dock`}
                    sx={{
                        borderTop: `2px solid ${theme.palette.primary.main}`,
                        backgroundColor: theme.palette.background.paper,
                        flexShrink: 0,
                    }}
                >
                    {/* Dock header */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            px: 2,
                            py: 0.5,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Typography
                            variant="overline"
                            sx={{fontWeight: "bold", letterSpacing: 1, lineHeight: 1.8}}
                        >
                            Network Editor
                        </Typography>
                        <IconButton
                            size="small"
                            aria-label="close edit mode"
                            onClick={handleExitEditMode}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <Typography
                        variant="caption"
                        sx={{
                            px: 2,
                            pt: 0.5,
                            pb: 0,
                            color: theme.palette.text.secondary,
                            display: "block",
                        }}
                    >
                        Changes apply only to this Temporary network
                    </Typography>
                    {/* Prompt input row */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1,
                            px: 2,
                            py: 1.5,
                            alignItems: "center",
                        }}
                    >
                        <TextField
                            fullWidth
                            id={`${id}-dock-prompt-input`}
                            placeholder={DOCK_PROMPT_PLACEHOLDER}
                            variant="outlined"
                            size="small"
                            value={dockPrompt}
                            onChange={(e) => setDockPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    void handleDockApply()
                                }
                            }}
                            disabled={isDockStreaming}
                            slotProps={{htmlInput: {style: {fontSize: "0.85rem"}}}}
                        />
                        <Button
                            id={`${id}-dock-apply-button`}
                            variant="contained"
                            onClick={() => void handleDockApply()}
                            disabled={isDockStreaming || !dockPrompt.trim()}
                            sx={{whiteSpace: "nowrap", minWidth: 120}}
                            startIcon={
                                isDockStreaming ? (
                                    <CircularProgress
                                        size={16}
                                        color="inherit"
                                    />
                                ) : undefined
                            }
                        >
                            {isDockStreaming ? "Applying…" : "Apply"}
                        </Button>
                    </Box>
                </Box>
            )}
            {selectedAgent && !isAwaitingLlm && (
                <AgentNodePopup
                    agentName={selectedAgent.agentName}
                    initialInstructions={selectedAgent.initialInstructions}
                    initialDescription={selectedAgent.initialDescription}
                    isOpen={isPopupOpen}
                    isSaving={isSavingAgent}
                    onClose={handlePopupClose}
                    onSave={handlePopupSave}
                />
            )}
            <Backdrop
                id={`${id}-global-saving-backdrop`}
                open={isDockStreaming || isSavingAgent}
                sx={{zIndex: (t) => t.zIndex.modal + 1}}
            >
                <Paper
                    elevation={6}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        px: 4,
                        py: 2.5,
                        borderRadius: 2,
                        maxWidth: 480,
                    }}
                >
                    <CircularProgress
                        id={`${id}-global-saving-spinner`}
                        size={24}
                    />
                    <Box>
                        <Typography
                            id={`${id}-global-saving-title`}
                            variant="body1"
                            fontWeight="bold"
                        >
                            {isSavingAgent ? "Saving agent…" : "Applying changes to network"}
                        </Typography>
                        {isDockStreaming && dockPrompt && (
                            <Typography
                                id={`${id}-global-saving-prompt`}
                                variant="body2"
                                color="text.secondary"
                                sx={{mt: 0.25}}
                            >
                                {dockPrompt}
                            </Typography>
                        )}
                    </Box>
                </Paper>
            </Backdrop>
        </Box>
    )
}

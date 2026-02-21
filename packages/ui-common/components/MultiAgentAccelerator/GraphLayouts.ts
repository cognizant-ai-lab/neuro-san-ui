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

/**
 * Graph layout algorithms and associated functions for the agent network.
 */
import dagre from "@dagrejs/dagre"
import {Edge, MarkerType, Node as RFNode} from "@xyflow/react"
import cloneDeep from "lodash-es/cloneDeep.js"

import {AgentNodeProps, NODE_HEIGHT, NODE_WIDTH} from "./AgentNode"
import {BASE_RADIUS, DEFAULT_FRONTMAN_X_POS, DEFAULT_FRONTMAN_Y_POS, LEVEL_SPACING} from "./const"
import {ThoughtBubbleEdgeShape} from "./ThoughtBubbleEdge"
import {ConnectivityInfo} from "../../generated/neuro-san/NeuroSanClient"
import {AgentConversation} from "../../utils/agentConversations"
import {cleanUpAgentName, KNOWN_MESSAGE_TYPES_FOR_PLASMA} from "../AgentChat/Utils"

export const MAX_GLOBAL_THOUGHT_BUBBLES = 5

/**
 * Result of the layout algorithms, containing the nodes and edges with their computed positions and properties.
 */
export type LayoutResult = {
    nodes: RFNode<AgentNodeProps>[]
    edges: Edge[]
}

export const addThoughtBubbleEdge = (
    thoughtBubbleEdges: Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>,
    conversationId: string,
    edge: ThoughtBubbleEdgeShape
) => {
    // Add with timestamp for age-based cleanup
    thoughtBubbleEdges.set(conversationId, {
        edge,
        timestamp: Date.now(),
    })

    // Enforce max limit - remove oldest if over limit
    if (thoughtBubbleEdges.size > MAX_GLOBAL_THOUGHT_BUBBLES) {
        const entries = Array.from(thoughtBubbleEdges.entries())
        const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
        const toRemove = sorted.slice(0, sorted.length - MAX_GLOBAL_THOUGHT_BUBBLES)

        toRemove.forEach(([id]) => {
            thoughtBubbleEdges.delete(id)
        })
    }
}

export const removeThoughtBubbleEdge = (
    thoughtBubbleEdges: Map<string, {edge: Edge; timestamp: number}>,
    conversationId: string
) => {
    thoughtBubbleEdges.delete(conversationId)
}

export const getThoughtBubbleEdges = (thoughtBubbleEdges: Map<string, {edge: Edge; timestamp: number}>): Edge[] => {
    return Array.from(thoughtBubbleEdges.values()).map((item) => item.edge)
}

// Helper function for plasma edges to check if two agents are in the same conversation
const areInSameConversation = (
    conversations: AgentConversation[] | null,
    sourceAgent: string,
    targetAgent: string
): boolean => {
    if (!conversations) return false

    return conversations
        .filter((conversation) => KNOWN_MESSAGE_TYPES_FOR_PLASMA.includes(conversation.type))
        .some((conversation) => conversation.agents.has(sourceAgent) && conversation.agents.has(targetAgent))
}

// #region: Constants

// Name for custom node
const AGENT_NODE_TYPE_NAME = "agentNode"

// #endregion: Constants

/**
 * Returns the "origins" (node names) of the _immediate_ parents of a node in the agent network. Grandparents and
 * higher are not included.
 *
 * @param node Node ID for which to find parents
 * @param parentAgents Full list of parent agents in the network
 * @returns The IDs of the immediate parent nodes for the given node or empty array if no parents are found (frontman)
 */
const getParents = (node: string, parentAgents: ConnectivityInfo[]): string[] => {
    return parentAgents.filter((agent) => agent.tools.includes(node)).map((parentNode) => parentNode.origin)
}

// "Parent agents" are those that have tools, aka "child agents"
const getParentAgents = (agentsInNetwork: ConnectivityInfo[]): ConnectivityInfo[] =>
    agentsInNetwork.length === 1 ? agentsInNetwork : agentsInNetwork.filter((agent) => agent.tools?.length > 0)

// "Child agents" are those that are declared as tools by other agents
const getChildAgents = (parentAgents: ConnectivityInfo[]): Set<string> => {
    const childAgentsSet = new Set<string>()
    parentAgents.forEach((agent) => {
        agent?.tools?.forEach((tool) => {
            childAgentsSet.add(tool)
        })
    })
    return childAgentsSet
}

// Frontman is defined as the agent that has no parent. There should be only one in the graph.
// Frontman is one of the parent agents.
// There is no explicit field that tells us which agent is the frontman, so we determine it by checking
// which parent agent does not appear in the set of child agents.
const getFrontman = (parentAgents: ConnectivityInfo[], childAgents: Set<string>): ConnectivityInfo =>
    parentAgents.find((agent) => !childAgents.has(agent.origin))

// Generates the properties for an edge in the graph.
// Common for both radial and linear layouts.
const getEdgeProperties = (
    sourceId: string,
    targetId: string,
    sourceHandle: string,
    targetHandle: string,
    isAnimated: boolean
): Edge => {
    return {
        animated: false,
        id: `${targetId}-edge-${sourceId}`,
        markerEnd: {type: MarkerType.ArrowClosed, width: 30, height: 30},
        source: sourceId,
        sourceHandle,
        target: targetId,
        targetHandle,
        type: isAnimated ? "plasmaEdge" : undefined,
    }
}

export const layoutRadial = (
    agentCounts: Map<string, number>,
    agentsInNetwork: ConnectivityInfo[],
    currentConversations: AgentConversation[] | null, // For plasma edges (live) and node highlighting
    isAwaitingLlm: boolean,
    thoughtBubbleEdges: Map<string, {edge: Edge; timestamp: number}>,
    agentIconSuggestions: Record<string, string> = {}
): LayoutResult => {
    const nodesInNetwork: RFNode<AgentNodeProps>[] = []
    const edgesInNetwork: Edge[] = []

    // Compute depth of each node using breadth-first traversal
    const nodeDepths = new Map<string, number>()
    const queue: {id: string; depth: number}[] = []

    const parentAgents = getParentAgents(agentsInNetwork)
    const childAgents = getChildAgents(parentAgents)

    const frontman = getFrontman(parentAgents, childAgents)
    if (frontman) {
        // Add the frontman node to the network
        queue.push({id: frontman.origin, depth: 0})
        nodeDepths.set(frontman.origin, 0)
    }

    // Perform a breadth-first traversal of the tree to compute the depth of each node.
    while (queue.length > 0) {
        const {id: currentNodeId, depth} = queue.shift()

        agentsInNetwork.forEach(({origin: nodeId}) => {
            // For each node, check if it is a direct child of the  current node in the queue.
            const parentIds = getParents(nodeId, parentAgents)
            if (parentIds?.includes(currentNodeId) && !nodeDepths.has(nodeId)) {
                // It's a child of the current node so set its depth to the depth of the current node + 1.
                nodeDepths.set(nodeId, depth + 1)
                queue.push({id: nodeId, depth: depth + 1})
            }
        })
    }

    // Construct a map where keys are depths and values are arrays of node IDs at that depth.
    const nodesByDepth = new Map<number, string[]>()

    nodeDepths.forEach((depth, nodeId) => {
        if (!nodesByDepth.has(depth)) {
            nodesByDepth.set(depth, [])
        }
        nodesByDepth.get(depth).push(nodeId)
    })

    // Assign layout positions based on depth & spread angles per level
    // Use currentConversations for plasma edges and node highlighting (cleared at network end)

    nodesByDepth.forEach((nodeIds, depth) => {
        const radius = BASE_RADIUS + depth * LEVEL_SPACING
        const angleStep = (2 * Math.PI) / nodeIds.length // Divide full circle among nodes at this level

        nodeIds.forEach((nodeId, index) => {
            const angle = index * angleStep // Spread nodes evenly in their depth level
            const x = DEFAULT_FRONTMAN_X_POS + radius * Math.cos(angle)
            const y = DEFAULT_FRONTMAN_Y_POS + radius * Math.sin(angle)

            const isFrontman = frontman?.origin === nodeId

            const parentNodes = getParents(nodeId, parentAgents)

            // Create an edge from each parent node to this node
            for (const parentNode of parentNodes) {
                const graphNode = nodesInNetwork.find((node) => node.id === parentNode)
                // Determine if the agent is left or right of its parent node for symmetrical layout
                if (graphNode) {
                    const dx = x - graphNode.position.x
                    const dy = y - graphNode.position.y

                    let sourceHandle: string
                    let targetHandle: string

                    // Determine the handle based on the direction of the node relative to its parent
                    if (Math.abs(dx) > Math.abs(dy)) {
                        // More horizontal: use left/right handles
                        const isLeftOfParent = dx < 0
                        sourceHandle = isLeftOfParent ? `${graphNode.id}-left-handle` : `${graphNode.id}-right-handle`
                        targetHandle = isLeftOfParent ? `${nodeId}-right-handle` : `${nodeId}-left-handle`
                    } else {
                        // More vertical: use top/bottom handles
                        const isAboveParent = dy < 0
                        sourceHandle = isAboveParent ? `${graphNode.id}-top-handle` : `${graphNode.id}-bottom-handle`
                        targetHandle = isAboveParent ? `${nodeId}-bottom-handle` : `${nodeId}-top-handle`
                    }

                    // Plasma edges based on currentConversations (live, cleared at network end)
                    const isEdgeAnimated = areInSameConversation(currentConversations, nodeId, graphNode.id)

                    // Add edge from parent to node
                    if (!isAwaitingLlm || isEdgeAnimated) {
                        edgesInNetwork.push(
                            getEdgeProperties(graphNode.id, nodeId, sourceHandle, targetHandle, isEdgeAnimated)
                        )
                    }
                }
            }

            nodesInNetwork.push({
                id: nodeId,
                type: AGENT_NODE_TYPE_NAME,
                data: {
                    agentCounts,
                    agentName: cleanUpAgentName(nodeId),
                    depth,
                    displayAs: agentsInNetwork.find((a) => a.origin === nodeId)?.display_as,
                    // Use current conversations for node highlighting (cleared at end)
                    getConversations: () => currentConversations,
                    isAwaitingLlm,
                    agentIconSuggestion: agentIconSuggestions?.[nodeId],
                },
                position: isFrontman ? {x: DEFAULT_FRONTMAN_X_POS, y: DEFAULT_FRONTMAN_Y_POS} : {x, y},
                style: {
                    border: "none",
                    background: "transparent",
                    boxShadow: "none",
                    padding: 0,
                    margin: 0,
                },
            })
        })
    })

    // Add thought bubble edges from cache to avoid duplicates across layout recalculations
    const bubbleEdges = getThoughtBubbleEdges(thoughtBubbleEdges)
    const thoughtBubbleEdgesToAdd = bubbleEdges.filter((edge: Edge) =>
        edgesInNetwork.every((existing: Edge) => existing.id !== edge.id && edge.type === "thoughtBubbleEdge")
    )

    edgesInNetwork.push(...thoughtBubbleEdgesToAdd)

    return {nodes: nodesInNetwork, edges: edgesInNetwork}
}

export const layoutLinear = (
    agentCounts: Map<string, number>,
    agentsInNetwork: ConnectivityInfo[],
    currentConversations: AgentConversation[] | null, // For plasma edges (live) and node highlighting
    isAwaitingLlm: boolean,
    thoughtBubbleEdges: Map<string, {edge: Edge; timestamp: number}>,
    agentIconSuggestions: Record<string, string> = {}
): LayoutResult => {
    const nodesInNetwork: RFNode<AgentNodeProps>[] = []
    const edgesInNetwork: Edge[] = []

    // Do these calculations outside the loop for efficiency
    const parentAgents = getParentAgents(agentsInNetwork)
    const childAgents = getChildAgents(parentAgents)
    const frontman = getFrontman(parentAgents, childAgents)

    agentsInNetwork.forEach(({origin: originOfNode}) => {
        const parentIds = getParents(originOfNode, parentAgents)
        const isFrontman = frontman?.origin === originOfNode

        nodesInNetwork.push({
            id: originOfNode,
            type: AGENT_NODE_TYPE_NAME,
            data: {
                agentCounts,
                agentName: cleanUpAgentName(originOfNode),
                displayAs: agentsInNetwork.find((a) => a.origin === originOfNode)?.display_as,
                // Use current conversations for node highlighting (cleared at end)
                getConversations: () => currentConversations,
                isAwaitingLlm,
                depth: undefined, // Depth will be computed later,
                agentIconSuggestion: agentIconSuggestions?.[originOfNode],
            },
            position: isFrontman ? {x: DEFAULT_FRONTMAN_X_POS, y: DEFAULT_FRONTMAN_Y_POS} : {x: 0, y: 0},
            style: {
                border: "none",
                background: "transparent",
                boxShadow: "none",
                padding: 0,
                margin: 0,
            },
        })

        if (!isFrontman) {
            for (const parentNode of parentIds) {
                // Add edges from parents to node
                const isEdgeAnimated = areInSameConversation(currentConversations, parentNode, originOfNode)

                // Include all edges here, since dagre needs them to compute the layout correctly.
                // We will filter them later if we're in "awaiting LLM" mode.
                edgesInNetwork.push(
                    getEdgeProperties(
                        parentNode,
                        originOfNode,
                        `${parentNode}-right-handle`,
                        `${originOfNode}-left-handle`,
                        isEdgeAnimated
                    )
                )
            }
        }
    })

    // Add thought bubble edges from cache to avoid duplicates across layout recalculations
    const bubbleEdges = getThoughtBubbleEdges(thoughtBubbleEdges)
    const thoughtBubbleEdgesToAdd = bubbleEdges.filter((edge: Edge) =>
        edgesInNetwork.every((existing: Edge) => existing.id !== edge.id && edge.type === "thoughtBubbleEdge")
    )

    edgesInNetwork.push(...thoughtBubbleEdgesToAdd)

    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    // Configure for left-to-right layout
    dagreGraph.setGraph({rankdir: "LR"})

    // Don't want to update nodes directly in existing flow so make a copy
    const nodesTmp = cloneDeep(nodesInNetwork)

    nodesTmp.forEach((node) => {
        dagreGraph.setNode(node.id, {width: NODE_WIDTH, height: NODE_HEIGHT})
    })

    // Add edges to the dagre graph
    edgesInNetwork.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target)
    })

    // Compute the layout using dagre
    dagre.layout(dagreGraph)

    // Get x positions for the nodes in nodesTmp. Keep only unique values and sort numerically
    const xPositions = Array.from(new Set(nodesTmp.map((node) => dagreGraph.node(node.id).x))).sort((a, b) => a - b)

    // Convert dagre's layout to what our flow graph needs
    nodesTmp.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id)

        // We are shifting the dagre node position (anchor=center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - NODE_WIDTH / 2,
            y: nodeWithPosition.y - NODE_HEIGHT / 2,
        }

        // Depth is index of x position in xPositions array
        // Create a new data object with updated depth
        node.data = {
            ...node.data,
            depth: xPositions.indexOf(nodeWithPosition.x),
        }
    })

    // If we're in "awaiting LLM" mode, we filter edges to only include those that are between conversation agents.
    // Use currentConversations (plasma edges are live and clear at network end)
    const filteredEdges = isAwaitingLlm
        ? edgesInNetwork.filter((edge) => areInSameConversation(currentConversations, edge.source, edge.target))
        : edgesInNetwork

    // Add thought bubble edges from cache to avoid duplicates across layout recalculations
    const globalBubbleEdges = getThoughtBubbleEdges(thoughtBubbleEdges)
    const thoughtBubbles = globalBubbleEdges.filter((edge: Edge) =>
        filteredEdges.every((existing: Edge) => existing.id !== edge.id)
    )

    filteredEdges.push(...thoughtBubbles)

    return {nodes: nodesTmp, edges: filteredEdges}
}

/**
 * Graph layout algorithms and associated functions for the agent network.
 */
import dagre from "dagre"
import {cloneDeep} from "lodash"
import {Edge, EdgeProps, MarkerType, Node as RFNode} from "reactflow"

import {AgentNodeProps, NODE_HEIGHT, NODE_WIDTH} from "./AgentNode"
import {BASE_RADIUS, DEFAULT_FRONTMAN_X_POS, DEFAULT_FRONTMAN_Y_POS, LEVEL_SPACING} from "./const"
import {ConnectivityInfo, Origin} from "../../generated/neuro-san/OpenAPITypes"
import {cleanUpAgentName} from "../AgentChat/Utils"

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

export const layoutRadial = (
    agentsInNetwork: ConnectivityInfo[],
    getOriginInfo: () => Origin[],
    agentCounts: Map<string, number>,
    isAwaitingLlm: boolean
): {
    nodes: RFNode<AgentNodeProps>[]
    edges: Edge<EdgeProps>[]
} => {
    const centerX = DEFAULT_FRONTMAN_X_POS
    const centerY = DEFAULT_FRONTMAN_Y_POS

    const nodesInNetwork = []
    const edgesInNetwork = []

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
    nodesByDepth.forEach((nodeIds, depth) => {
        const radius = BASE_RADIUS + depth * LEVEL_SPACING
        const angleStep = (2 * Math.PI) / nodeIds.length // Divide full circle among nodes at this level

        nodeIds.forEach((nodeId, index) => {
            const angle = index * angleStep // Spread nodes evenly in their depth level
            const x = centerX + radius * Math.cos(angle)
            const y = centerY + radius * Math.sin(angle)

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

                    // Add edge from parent to node
                    edgesInNetwork.push({
                        id: `${nodeId}-edge-${graphNode.id}`,
                        key: `${nodeId}-edge-${graphNode.id}`,
                        source: graphNode.id,
                        sourceHandle,
                        target: nodeId,
                        targetHandle,
                        animated: false,
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 30,
                            height: 30,
                        },
                    })
                }
            }

            nodesInNetwork.push({
                id: nodeId,
                type: AGENT_NODE_TYPE_NAME,
                data: {
                    agentName: cleanUpAgentName(nodeId),
                    getOriginInfo,
                    depth,
                    agentCounts,
                    isAwaitingLlm,
                },
                position: isFrontman ? {x: centerX, y: centerY} : {x, y},
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

    return {nodes: nodesInNetwork, edges: edgesInNetwork}
}

export const layoutLinear = (
    agentsInNetwork: ConnectivityInfo[],
    getOriginInfo: () => Origin[],
    agentCounts: Map<string, number>,
    isAwaitingLlm: boolean
): {
    nodes: RFNode<AgentNodeProps>[]
    edges: Edge<EdgeProps>[]
} => {
    const nodesInNetwork = []
    const edgesInNetwork = []
    agentsInNetwork.forEach(({origin: originOfNode}) => {
        const parentAgents = getParentAgents(agentsInNetwork)
        const childAgents = getChildAgents(parentAgents)

        const frontman = getFrontman(parentAgents, childAgents)

        const parentIds = getParents(originOfNode, parentAgents)
        const isFrontman = frontman?.origin === originOfNode

        nodesInNetwork.push({
            id: originOfNode,
            type: AGENT_NODE_TYPE_NAME,
            data: {
                agentName: cleanUpAgentName(originOfNode),
                getOriginInfo,
                agentCounts,
                isAwaitingLlm,
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
                edgesInNetwork.push({
                    id: `${originOfNode}-edge-${parentNode}`,
                    source: parentNode,
                    sourceHandle: `${parentNode}-right-handle`,
                    target: originOfNode,
                    targetHandle: `${originOfNode}-left-handle`,
                    animated: false,
                })
            }
        }
    })

    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    // Configure for left-to-right layout
    dagreGraph.setGraph({rankdir: "LR"})

    // Don't want to update nodes directly in existing flow so make a copy
    const nodesTmp = cloneDeep(nodesInNetwork)

    nodesTmp.forEach((node) => {
        dagreGraph.setNode(node.id, {width: NODE_WIDTH, height: NODE_HEIGHT})
    })

    edgesInNetwork.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    // Get x positions for the nodes in nodesTmp. Keep only unique values and sort numerically
    const xPositions = Array.from(new Set(nodesTmp.map((node) => dagreGraph.node(node.id).x))).sort((a, b) => a - b)

    // Convert dagre's layout to what our flow graph needs
    nodesTmp.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id)

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - NODE_WIDTH / 2,
            y: nodeWithPosition.y - NODE_HEIGHT / 2,
        }

        // Depth is index of x position in xPositions array
        node.data.depth = xPositions.indexOf(nodeWithPosition.x)
    })

    return {nodes: nodesTmp, edges: edgesInNetwork}
}

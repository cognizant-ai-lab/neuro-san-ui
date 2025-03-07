/**
 * Graph layout algorithms and associated functions for the agent network.
 */
import dagre from "dagre"
import {cloneDeep} from "lodash"
import {Edge, EdgeProps, Node as RFNode} from "reactflow"

import {AgentNodeProps} from "./AgentNode"
import {BASE_RADIUS, DEFAULT_FRONTMAN_X_POS, DEFAULT_FRONTMAN_Y_POS, LEVEL_SPACING} from "./const"
import {ConnectivityInfo} from "../../generated/neuro_san/api/grpc/agent"
import {cleanUpAgentName} from "../AgentChat/Utils"

// #region: Constants

// Name for custom node
const AGENT_NODE_TYPE_NAME = "agentNode"

// #endregion: Constants

const getParent = (
    node: string,
    frontman: ConnectivityInfo,
    parentAgents: ConnectivityInfo[],
    childAgents: Set<string>
) => {
    const isChild = childAgents.has(node)
    let parentId: string
    if (isChild) {
        // agent.tools.includes(originOfNode) is checking this node's origin
        // the .origin at the end is getting the parent node's origin
        parentId = parentAgents.find((agent) => agent.tools.includes(node)).origin
    } else {
        parentId = frontman.origin
    }
    return parentId
}

// "Parent agents" are those that have tools, aka "child agents"
const getParentAgents = (agentsInNetwork: ConnectivityInfo[]): ConnectivityInfo[] =>
    agentsInNetwork.length === 1 ? agentsInNetwork : agentsInNetwork.filter((agent) => agent.tools?.length > 0)

// "Child agents" are those that are declared as tools by other agents
const getChildAgents = (parentAgents: ConnectivityInfo[]): Set<string> => {
    const childAgentsSet = new Set<string>()
    parentAgents.forEach((agent) => {
        agent.tools.forEach((tool) => {
            childAgentsSet.add(tool)
        })
    })
    return childAgentsSet
}

// Frontman is defined as the agent that has no parent. There should be only one in the graph. Frontman is one of the
// parent agents.
const getFrontman = (parentAgents: ConnectivityInfo[], childAgents: Set<string>): ConnectivityInfo =>
    parentAgents.find((agent) => !childAgents.has(agent.origin))

export const layoutRadial = (
    agentsInNetwork: ConnectivityInfo[],
    getSelectedAgentId: () => string,
    getSourceAgentId: () => string | undefined
): {
    nodes: RFNode<AgentNodeProps>[]
    edges: Edge<EdgeProps>[]
} => {
    const centerX = DEFAULT_FRONTMAN_X_POS
    const centerY = DEFAULT_FRONTMAN_Y_POS

    const nodesInNetwork = []
    const edgesInNetwork = []

    // Step 1: Compute depth of each node using BFS
    const nodeDepths = new Map<string, number>()
    const children = new Map<string, string[]>()
    const queue: {id: string; depth: number}[] = []

    const parentAgents = getParentAgents(agentsInNetwork)
    const childAgents = getChildAgents(parentAgents)

    const frontman = getFrontman(parentAgents, childAgents)
    if (frontman) {
        queue.push({id: frontman.origin, depth: 0})
        nodeDepths.set(frontman.origin, 0)
    }

    while (queue.length > 0) {
        const {id: idTmp, depth} = queue.shift()

        agentsInNetwork.forEach(({origin: childId}) => {
            const parentId = getParent(childId, frontman, parentAgents, childAgents)
            if (parentId === idTmp && !nodeDepths.has(childId)) {
                nodeDepths.set(childId, depth + 1)
                queue.push({id: childId, depth: depth + 1})

                if (!children.has(idTmp)) {
                    children.set(idTmp, [])
                }
                children.get(idTmp).push(childId)
            }
        })
    }

    // Step 2: Organize nodes by depth
    const nodesByDepth = new Map<number, string[]>()

    nodeDepths.forEach((depth, nodeId) => {
        if (!nodesByDepth.has(depth)) {
            nodesByDepth.set(depth, [])
        }
        nodesByDepth.get(depth).push(nodeId)
    })

    // Step 3: Assign positions based on depth & spread angles per level
    nodesByDepth.forEach((nodeIds, depth) => {
        const radius = BASE_RADIUS + depth * LEVEL_SPACING
        const angleStep = (2 * Math.PI) / nodeIds.length // Divide full circle among nodes at this level

        nodeIds.forEach((nodeId, index) => {
            const angle = index * angleStep // Spread nodes evenly in their depth level
            const x = centerX + radius * Math.cos(angle)
            const y = centerY + radius * Math.sin(angle)

            const isFrontman = frontman?.origin === nodeId
            const parentNode = nodesInNetwork.find(
                (node) => node.id === getParent(nodeId, frontman, parentAgents, childAgents)
            )

            if (parentNode) {
                // Determine if the agent is left or right of its parent node for symmetrical layout
                const isLeftOfParent = x < parentNode.position.x

                edgesInNetwork.push({
                    id: `${nodeId}-edge`,
                    source: parentNode.id,
                    sourceHandle: isLeftOfParent ? `${parentNode.id}-left-handle` : `${parentNode.id}-right-handle`,
                    target: nodeId,
                    targetHandle: isLeftOfParent ? `${nodeId}-right-handle` : `${nodeId}-left-handle`,
                    animated: false,
                })
            }

            nodesInNetwork.push({
                id: nodeId,
                type: AGENT_NODE_TYPE_NAME,
                data: {
                    agentName: cleanUpAgentName(nodeId),
                    getSelectedAgentId,
                    getSourceAgentId,
                    isFrontman,
                    depth,
                },
                position: isFrontman ? {x: centerX, y: centerY} : {x, y},
            })
        })
    })

    return {nodes: nodesInNetwork, edges: edgesInNetwork}
}

export const layoutLinear = (
    agentsInNetwork: ConnectivityInfo[],
    getSelectedAgentId: () => string,
    getSourceAgentId: () => string | undefined
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

        const parentId = getParent(originOfNode, frontman, parentAgents, childAgents)
        const isFrontman = frontman?.origin === originOfNode

        nodesInNetwork.push({
            id: originOfNode,
            type: AGENT_NODE_TYPE_NAME,
            data: {
                agentName: cleanUpAgentName(originOfNode),
                getSelectedAgentId,
                getSourceAgentId,
                isFrontman,
            },
            position: isFrontman ? {x: DEFAULT_FRONTMAN_X_POS, y: DEFAULT_FRONTMAN_Y_POS} : {x: 0, y: 0},
        })

        if (!isFrontman) {
            // Add edge from parent to node
            edgesInNetwork.push({
                id: `${originOfNode}-edge`,
                source: parentId,
                sourceHandle: `${parentId}-right-handle`,
                target: originOfNode,
                targetHandle: `${originOfNode}-left-handle`,
                animated: false,
            })
        }
    })

    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    // Configure for left-to-right layout
    dagreGraph.setGraph({rankdir: "LR"})

    const nodeWidth = 250
    const nodeHeight = 36

    // Don't want to update nodes directly in existing flow so make a copy
    const nodesTmp = cloneDeep(nodesInNetwork)

    nodesTmp.forEach((node) => {
        dagreGraph.setNode(node.id, {width: nodeWidth, height: nodeHeight})
    })

    edgesInNetwork.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    // Convert dagre's layout to what our flow graph needs
    nodesTmp.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id)

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        }
    })

    return {nodes: nodesTmp, edges: edgesInNetwork}
}

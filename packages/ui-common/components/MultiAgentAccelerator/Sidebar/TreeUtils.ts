import {TreeViewBaseItem} from "@mui/x-tree-view/models"

import {AgentInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {TemporaryNetwork} from "../../../state/TemporaryNetworks"
import {cleanUpAgentName} from "../../AgentChat/Utils"

export type NodeIndex = Map<string, {agentInfo: AgentInfo; displayName: string}>

/**
 * Iteratively sort all children of tree nodes using a queue-based approach
 * @param nodes - Array of tree nodes to sort
 */
const sortTreeNodes = (nodes: TreeViewBaseItem[], nodeIndex: NodeIndex): void => {
    // Sort the top level nodes first. We sort by displayName because that's what the user sees
    nodes.sort((a, b) => {
        const aDisplayName = nodeIndex.get(a.id)?.displayName ?? a.label
        const bDisplayName = nodeIndex.get(b.id)?.displayName ?? b.label
        return aDisplayName.localeCompare(bDisplayName)
    })

    // Use a queue for breadth-first traversal to avoid recursion
    const queue: TreeViewBaseItem[] = [...nodes]
    let index = 0

    while (index < queue.length) {
        const node = queue[index]
        index += 1

        if (node.children && node.children.length > 0) {
            node.children.sort((a, b) => {
                const aDisplayName = nodeIndex.get(a.id)?.displayName ?? a.label
                const bDisplayName = nodeIndex.get(b.id)?.displayName ?? b.label
                return aDisplayName.localeCompare(bDisplayName)
            })
            queue.push(...node.children)
        }
    }
}

/**
 * Add a single AgentInfo entry into the tree structure
 */
const addNetworkToTree = (
    network: AgentInfo,
    result: TreeViewBaseItem[],
    uncategorized: TreeViewBaseItem,
    map: Map<string, TreeViewBaseItem>,
    nodeIndex: NodeIndex,
    displayNameCounts: Map<string, number>
): void => {
    const parts = network.agent_name.split("/")

    if (parts.length === 1) {
        uncategorized.children.push({id: network.agent_name, label: network.agent_name, children: []})
        nodeIndex.set(network.agent_name, {agentInfo: network, displayName: cleanUpAgentName(network.agent_name)})
    } else {
        let currentLevel = result

        parts.forEach((part, index) => {
            const nodeId = parts.slice(0, index + 1).join("/")
            let node = map.get(nodeId)

            if (!node) {
                node = {id: nodeId, label: part, children: []}
                map.set(nodeId, node)
                if (index === parts.length - 1) {
                    const guidRegex = /-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/u
                    const agentNameWithoutGuid = part.replace(guidRegex, "")
                    const cleanedName = cleanUpAgentName(agentNameWithoutGuid)
                    const count = displayNameCounts.get(cleanedName) || 0
                    displayNameCounts.set(cleanedName, count + 1)
                    const displayName = count > 0 ? `${cleanedName} ${count + 1}` : cleanedName
                    nodeIndex.set(nodeId, {agentInfo: network, displayName})
                }

                if (index === 0) {
                    currentLevel.push(node)
                } else {
                    const parentId = parts.slice(0, index).join("/")
                    const parentNode = map.get(parentId)
                    if (parentNode) {
                        parentNode.children.push(node)
                    }
                }
            }

            currentLevel = node.children
        })
    }
}

/**
 * Build a tree view structure from a flat list of networks.
 * The list of networks comes from a call to the Neuro-san /list API
 * The tree structure is used by the RichTreeView component to display the networks
 * @param networks - Array of networks from the Neuro-san /list API
 * @param temporaryNetworks - Array of temporary networks (e.g. ones recently created by the user)
 * @returns Array of TreeViewBaseItem objects representing the tree structure and an index for rapid access
 */
export const buildTreeViewItems = (
    networks: readonly AgentInfo[],
    temporaryNetworks: readonly TemporaryNetwork[]
): {treeViewItems: TreeViewBaseItem[]; nodeIndex: NodeIndex} => {
    // Map to keep track of created nodes in a tree structure
    const treeBuilderMap = new Map<string, TreeViewBaseItem>()

    // Index to quickly look up AgentInfo by node ID without having to traverse the tree
    const nodeIndex: NodeIndex = new Map()

    // Resulting tree view items, ready for consumption by RichTreeView
    const treeViewItems: TreeViewBaseItem[] = []

    // Special parent node for networks that aren't in any folder
    const uncategorized: TreeViewBaseItem = {id: "uncategorized", label: "Uncategorized", children: []}

    const displayNameCounts = new Map<string, number>()

    // Build a tree structure from the flat list of networks.
    // The networks come in as a series of "paths" like "industry/retail/macys" and we need to build a tree
    // structure from that.
    networks.forEach((network) =>
        addNetworkToTree(network, treeViewItems, uncategorized, treeBuilderMap, nodeIndex, displayNameCounts)
    )

    // Now handle temporary networks
    temporaryNetworks?.forEach((temporaryNetwork) =>
        addNetworkToTree(
            temporaryNetwork.agentInfo,
            treeViewItems,
            uncategorized,
            treeBuilderMap,
            nodeIndex,
            displayNameCounts
        )
    )

    // Add "Uncategorized" to the result if there are any such networks
    if (uncategorized.children.length > 0) {
        treeViewItems.push(uncategorized)
    }

    // Sort all nodes in the tree
    sortTreeNodes(treeViewItems, nodeIndex)

    return {treeViewItems, nodeIndex}
}

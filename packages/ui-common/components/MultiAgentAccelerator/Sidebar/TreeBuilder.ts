import {TreeViewBaseItem} from "@mui/x-tree-view/models"

import {AgentInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {TemporaryNetwork} from "../../../state/TemporaryNetworks"
import {cleanUpAgentName, removeTrailingUuid} from "../../AgentChat/Common/Utils"

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

    // For each node in the queue, sort its children and add them to the end of the queue
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

    // If there's only one part, it means this network isn't in any folder, so we add it directly under "Uncategorized"
    if (parts.length === 1) {
        uncategorized.children.push({id: network.agent_name, label: network.agent_name, children: []})
        nodeIndex.set(network.agent_name, {agentInfo: network, displayName: cleanUpAgentName(network.agent_name)})
    } else {
        // Otherwise, we need to build out the tree structure based on the parts of the agent_name. Some paths might
        // already exist if we've processed another network that shares the same parent folders,
        // so we check the map to avoid duplicating nodes.
        let currentLevel = result

        parts.forEach((part, index) => {
            // Build the full path ID by joining all parts up to the current position
            const nodeId = parts.slice(0, index + 1).join("/")
            let node = map.get(nodeId)

            if (!node) {
                // If we haven't created a node for this path yet, create it and add it to the map
                node = {id: nodeId, label: part, children: []}
                map.set(nodeId, node)
                if (index === parts.length - 1) {
                    const cleanedName = cleanUpAgentName(removeTrailingUuid(part))

                    // Handle duplicate display names by appending a number (e.g. "macys", "macys 2", "macys 3", etc.)
                    const count = displayNameCounts.get(cleanedName) || 0
                    displayNameCounts.set(cleanedName, count + 1)
                    const displayName = count > 0 ? `${cleanedName} ${count + 1}` : cleanedName

                    // Add the AgentInfo to the nodeIndex for quick lookup later, using the full path as the key
                    nodeIndex.set(nodeId, {agentInfo: network, displayName})
                }

                // If this is a top-level node (index 0), add it directly to the result.
                // Otherwise, find its parent and add it there.
                if (index === 0) {
                    // Top-level node, add directly to result
                    currentLevel.push(node)
                } else {
                    // Not a top-level node, find parent and add to its children
                    const parentId = parts.slice(0, index).join("/")
                    const parentNode = map.get(parentId)
                    if (parentNode) {
                        parentNode.children.push(node)
                    }
                }
            }

            // Move down to the next level of the tree for the next iteration
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

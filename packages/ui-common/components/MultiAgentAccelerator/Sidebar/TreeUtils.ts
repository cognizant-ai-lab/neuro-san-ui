import {TreeViewBaseItem} from "@mui/x-tree-view/models"

import {AgentInfo} from "../../../generated/neuro-san/NeuroSanClient"

/**
 * Iteratively sort all children of tree nodes using a queue-based approach
 * @param nodes - Array of tree nodes to sort
 */
const sortTreeNodes = (nodes: TreeViewBaseItem[]): void => {
    // Sort the top level nodes first
    nodes.sort((a, b) => a.label.localeCompare(b.label))

    // Use a queue for breadth-first traversal to avoid recursion
    const queue: TreeViewBaseItem[] = [...nodes]
    let index = 0

    while (index < queue.length) {
        const node = queue[index]
        index += 1

        if (node.children && node.children.length > 0) {
            node.children.sort((a, b) => a.label.localeCompare(b.label))
            queue.push(...node.children)
        }
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
    temporaryNetworks: readonly AgentInfo[]
): {treeViewItems: TreeViewBaseItem[]; index: Map<string, AgentInfo>} => {
    // Map to keep track of created nodes in a tree structure
    const map = new Map<string, TreeViewBaseItem>()

    // Index to quickly look up AgentInfo by node ID without having to traverse the tree
    const nodeIndex = new Map<string, AgentInfo>()

    // Resulting tree view items, ready for consumption by RichTreeView
    const result: TreeViewBaseItem[] = []

    // Special parent node for networks that aren't in any folder
    const uncategorized: TreeViewBaseItem = {id: "uncategorized", label: "Uncategorized", children: []}

    // Build a tree structure from the flat list of networks.
    // The networks come in as a series of "paths" like "industry/retail/macys" and we need to build a tree
    // structure from that.
    ;[...temporaryNetworks, ...networks].forEach((network) => {
        // Split the agent_name into parts based on "/"
        const parts = network.agent_name.split("/")

        if (parts.length === 1) {
            // Add single-name networks to the "Uncategorized" parent
            uncategorized.children.push({id: network.agent_name, label: network.agent_name, children: []})
            nodeIndex.set(network.agent_name, network)
        } else {
            // Start at the root level for each network
            let currentLevel = result

            // For each part of the path, create a new node if it doesn't exist
            parts.forEach((part, index) => {
                const nodeId = parts.slice(0, index + 1).join("/")
                let node = map.get(nodeId)

                if (!node) {
                    // Create new node
                    node = {id: nodeId, label: part, children: []}
                    map.set(nodeId, node)
                    // Only index leaf nodes (actual networks), not intermediate folder nodes
                    if (index === parts.length - 1) {
                        nodeIndex.set(nodeId, network)
                    }

                    if (index === 0) {
                        currentLevel.push(node)
                    } else {
                        // Find parent node and add this node to its children
                        const parentId = parts.slice(0, index).join("/")
                        const parentNode = map.get(parentId)
                        if (parentNode) {
                            parentNode.children.push(node)
                        }
                    }
                }

                // Descend into the tree for the next part
                currentLevel = node.children
            })
        }
    })

    // Add "Uncategorized" to the result if it has children
    if (uncategorized.children.length > 0) {
        result.push(uncategorized)
    }

    // Sort all nodes in the tree recursively
    sortTreeNodes(result)

    return {treeViewItems: result, index: nodeIndex}
}

import {TreeViewDefaultItemModelProperties} from "@mui/x-tree-view/models"

import {AgentInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {TemporaryNetwork} from "../../../state/TemporaryNetworks"
import {cleanUpAgentName, removeTrailingUuid} from "../../AgentChat/Common/Utils"

//#region Types and Interfaces

/**
 * Represents either a category (folder) or a network (leaf) in the tree view.
 * Note that we omit the `children` property from the parent as we want to use read-only semantics
 */
export interface AgentNetworkTreeItemModel extends Omit<TreeViewDefaultItemModelProperties, "children"> {
    readonly children?: readonly AgentNetworkTreeItemModel[]
    readonly displayName: string
    readonly iconSuggestion?: string
    readonly isNetwork: boolean
    readonly tags?: readonly string[]
    readonly temporaryNetworkExpirationTime?: Date
    readonly temporaryNetworkJson?: string | null
}

interface NetworkTreeItemMetadata {
    readonly iconSuggestion?: string
    readonly temporaryNetworkExpirationTime?: Date
    readonly temporaryNetworkJson?: string | null
    readonly displayNameOverride?: string
}

interface TreeBuildState {
    readonly categorizedItems: readonly AgentNetworkTreeItemModel[]
    readonly uncategorizedItems: readonly AgentNetworkTreeItemModel[]
}

//#endregion

/**
 * Recursively searches for a tree item with the specified ID within the given list of tree items.
 * @param items - The list of tree items to search through
 * @param itemId - The ID of the tree item to find
 * @returns The tree item with the matching ID, or undefined if not found
 *
 * @note Short-circuiting is used to avoid unnecessary searches once a match is found (compared to e.g., `flatMap()`)
 */
export const findTreeItemById = (
    items: readonly AgentNetworkTreeItemModel[],
    itemId: string
): AgentNetworkTreeItemModel | undefined => {
    for (const item of items) {
        if (item.id === itemId) {
            return item
        }

        const childMatch = item.children ? findTreeItemById(item.children, itemId) : undefined
        if (childMatch) {
            return childMatch
        }
    }

    return undefined
}

/**
 * Converts a raw agent name into a display name for the tree view, respecting the user's preference for native
 * vs cleaned names.
 * @param itemName - The raw agent name from the API
 * @param useNativeNames - Whether to use native names or cleaned-up names for display
 * @returns The display name to show in the tree view
 */
const toDisplayName = (itemName: string, useNativeNames: boolean): string =>
    useNativeNames ? itemName : cleanUpAgentName(removeTrailingUuid(itemName))

/**
 * Computes the display name for a network (leaf) node, disambiguating duplicates by appending a number.
 * @param label - The label to use for the tree item (usually derived from the agent name)
 * @param useNativeNames - Whether to use native names or cleaned-up names for display
 * @param displayNameCounts - Tracks how many times each cleaned display name has been used so duplicates can be
 * disambiguated (e.g. "macys", "macys 2", "macys 3"). Mutated as names are assigned.
 * @param displayNameOverride - For temporary networks, `label` is the raw reservation_id, which is canonicalized and
 * may have lost the word separators (_/-) that cleanUpAgentName relies on. When provided (the temp network's
 * agentNetworkName), it is used as the basis for the cleaned name instead of the path part.
 * @returns The display name to show in the tree view
 */
const toLeafDisplayName = (
    label: string,
    useNativeNames: boolean,
    displayNameCounts: Map<string, number>,
    displayNameOverride?: string
): string => {
    // Native mode shows the raw agent name part, unmodified.
    if (useNativeNames) {
        return label
    }

    const cleanedName = cleanUpAgentName(displayNameOverride ?? removeTrailingUuid(label))

    // Handle duplicate display names by appending a number (e.g. "macys", "macys 2", "macys 3")
    const count = displayNameCounts.get(cleanedName) ?? 0
    displayNameCounts.set(cleanedName, count + 1)
    return count > 0 ? `${cleanedName} ${count + 1}` : cleanedName
}

/**
 * Converts an AgentInfo object into a tree item model representing a network (leaf node).
 * @param network - The AgentInfo object containing details about the network
 * @param label - The label to use for the tree item (usually derived from the agent name)
 * @param useNativeNames - Whether to use native names or cleaned-up names for display
 * @param displayNameCounts - Shared map used to disambiguate duplicate display names
 * @param metadata - Additional metadata for the network tree item, such as icon suggestions and temporary network info
 * @returns An AgentNetworkTreeItemModel representing the network as a leaf node in the tree
 */
const toNetworkLeaf = (
    network: AgentInfo,
    label: string,
    useNativeNames: boolean,
    displayNameCounts: Map<string, number>,
    metadata: NetworkTreeItemMetadata = {}
): AgentNetworkTreeItemModel => ({
    id: network.agent_name,
    label,
    displayName: toLeafDisplayName(label, useNativeNames, displayNameCounts, metadata.displayNameOverride),
    iconSuggestion: metadata.iconSuggestion,
    isNetwork: true,
    tags: network.tags,
    temporaryNetworkExpirationTime: metadata.temporaryNetworkExpirationTime,
    temporaryNetworkJson: metadata.temporaryNetworkJson,
})

/**
 * Recursively sort tree nodes and their children by display name
 * @param nodes - Array of tree nodes to sort
 * @returns New array of tree nodes sorted by display name, with children also sorted
 */
const toSortedTreeNodes = (nodes: readonly AgentNetworkTreeItemModel[]): AgentNetworkTreeItemModel[] =>
    [...nodes]
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((node) => ({
            ...node,
            children: node.children ? toSortedTreeNodes(node.children) : undefined,
        }))

/**
 * Creates a tree item model representing a category (folder node) in the tree view.
 * @param id - The unique ID for the folder node, typically derived from the category path
 * @param label - The label to use for the tree item (usually derived from the category name)
 * @param useNativeNames - Whether to use native names or cleaned-up names for display
 * @returns An AgentNetworkTreeItemModel representing the category as a folder node in the tree
 */
const toFolderNode = (id: string, label: string, useNativeNames: boolean): AgentNetworkTreeItemModel => ({
    id,
    label,
    displayName: toDisplayName(label, useNativeNames),
    isNetwork: false,
    children: [],
})

/**
 * Recursively adds a network to the categorized tree structure based on its agent name parts.
 * @param nodes - The current list of tree nodes at this level of the hierarchy
 * @param network - The AgentInfo object representing the network to add
 * @param useNativeNames - Whether to use native names or cleaned-up names for display
 * @param displayNameCounts - Shared map used to disambiguate duplicate display names
 * @param metadata - Additional metadata for the network tree item, such as icon suggestions and temporary network info
 * @param parts - The parts of the agent name split by "/", used to determine the category hierarchy
 * @param depth - The current depth in the category hierarchy, used to determine which part of the agent name to use
 * for this level. For example, if the agent name is "category/subcategory/network", then at depth 0 we use "category",
 * at depth 1 we use "subcategory", and at depth 2 we use "network".
 */
const withCategorizedNetworkAdded = (
    nodes: readonly AgentNetworkTreeItemModel[],
    network: AgentInfo,
    useNativeNames: boolean,
    displayNameCounts: Map<string, number>,
    metadata: NetworkTreeItemMetadata,
    parts: readonly string[],
    depth = 0
): AgentNetworkTreeItemModel[] => {
    const label = parts[depth]

    // The node ID is constructed from the parts up to the current depth, analogous to a file path.
    const nodeId = parts.slice(0, depth + 1).join("/")

    // It's a network (leaf node) if we're at the last part of the agent name, otherwise it's a category (folder node)
    const isNetwork = depth === parts.length - 1

    // Check if a node with this ID already exists at the current level
    const existingIndex = nodes.findIndex((node) => node.id === nodeId)

    // If it's a network, we create a leaf node. If it's a category, we either create a new folder node or
    // update the existing one with the new child.
    const nextNode: AgentNetworkTreeItemModel = isNetwork
        ? toNetworkLeaf(network, label, useNativeNames, displayNameCounts, metadata)
        : {
              ...(existingIndex >= 0 ? nodes[existingIndex] : toFolderNode(nodeId, label, useNativeNames)),
              children: withCategorizedNetworkAdded(
                  existingIndex >= 0 ? (nodes[existingIndex].children ?? []) : [],
                  network,
                  useNativeNames,
                  displayNameCounts,
                  metadata,
                  parts,
                  depth + 1
              ),
          }

    // If the node doesn't already exist, we add it to the list. If it does exist, we replace it with the updated node.
    if (existingIndex < 0) {
        return [...nodes, nextNode]
    }

    // Return a new array with the existing node replaced by the updated node
    return nodes.map((node, index) => (index === existingIndex ? nextNode : node))
}

/**
 * Adds a network to the tree build state, either as an uncategorized item if its agent name has no "/"
 * or as a categorized item
 * @param state - The current state of the tree build, containing categorized and uncategorized items
 * @param network - The AgentInfo object representing the network to add to the tree
 * @param useNativeNames - Whether to use native names or cleaned-up names for display
 * @param displayNameCounts - Shared map used to disambiguate duplicate display names
 * @param metadata - Additional metadata for the network tree item, such as icon suggestions and temporary network info
 */
const withNetworkAdded = (
    state: TreeBuildState,
    network: AgentInfo,
    useNativeNames: boolean,
    displayNameCounts: Map<string, number>,
    metadata: NetworkTreeItemMetadata
): TreeBuildState => {
    // Split the agent name into parts based on "/", which indicates category hierarchy. For example, an agent name
    const parts = network.agent_name.split("/")

    // If there are no "/" in the agent name, we consider it uncategorized and add it to the uncategorized items list.
    if (parts.length === 1) {
        return {
            ...state,
            uncategorizedItems: [
                ...state.uncategorizedItems,
                toNetworkLeaf(network, network.agent_name, useNativeNames, displayNameCounts, metadata),
            ],
        }
    }

    // Return the updated state with the network added to the categorized items
    return {
        ...state,
        categorizedItems: withCategorizedNetworkAdded(
            state.categorizedItems,
            network,
            useNativeNames,
            displayNameCounts,
            metadata,
            parts
        ),
    }
}

/**
 * Build a tree view structure from a flat list of networks.
 * The list of networks comes from a call to the Neuro-san /list API
 * The tree structure is used by the RichTreeView component to display the networks.
 *
 * @param useNativeNames - Whether to use the raw agent names from the API or to clean them up for display.
 * @param regularNetworks - Array of networks from the Neuro-san /list API
 * @param temporaryNetworks - Array of temporary networks (e.g., ones recently created by the user)
 * @param iconSuggestions
 * @returns Array of {@linkcode AgentNetworkTreeItemModel} objects representing the tree structure
 */
export const buildTreeViewItems = (
    useNativeNames: boolean,
    regularNetworks: readonly AgentInfo[] = [],
    temporaryNetworks: readonly TemporaryNetwork[] = [],
    iconSuggestions: Record<string, string> = {}
): AgentNetworkTreeItemModel[] => {
    let tree: TreeBuildState = {
        categorizedItems: [],
        uncategorizedItems: [],
    }

    // Tracks how many times each cleaned display name has been used, so duplicates can be disambiguated.
    const displayNameCounts = new Map<string, number>()

    for (const network of regularNetworks) {
        tree = withNetworkAdded(tree, network, useNativeNames, displayNameCounts, {
            iconSuggestion: iconSuggestions[network.agent_name],
        })
    }

    for (const temporaryNetwork of temporaryNetworks) {
        tree = withNetworkAdded(tree, temporaryNetwork.agentInfo, useNativeNames, displayNameCounts, {
            iconSuggestion: "HourglassTop",
            temporaryNetworkExpirationTime: new Date(temporaryNetwork.reservation.expiration_time_in_seconds * 1000),
            // Temporary networks are downloaded as JSON, serialized from their structured agent network definition
            // (the same shape the import modal reads back in).
            temporaryNetworkJson: temporaryNetwork.agentNetworkDefinition
                ? JSON.stringify(temporaryNetwork.agentNetworkDefinition, null, 2)
                : null,
            displayNameOverride: temporaryNetwork.agentNetworkName,
        })
    }

    const treeViewItems: readonly AgentNetworkTreeItemModel[] =
        tree.uncategorizedItems.length > 0
            ? [
                  ...tree.categorizedItems,
                  {
                      id: "uncategorized",
                      label: "uncategorized",
                      displayName: toDisplayName("uncategorized", useNativeNames),
                      isNetwork: false,
                      children: tree.uncategorizedItems,
                  },
              ]
            : tree.categorizedItems

    return toSortedTreeNodes(treeViewItems)
}

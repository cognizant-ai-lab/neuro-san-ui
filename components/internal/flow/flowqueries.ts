import debugModule from "debug"
import {isEdge, isNode} from "reactflow"

import {EdgeType} from "./edges/types"
import {DataSourceNode} from "./nodes/datasourcenode"
import {ConfigurableNode} from "./nodes/generic/configurableNode"
import {PredictorNode} from "./nodes/predictornode"
import {PrescriptorNode} from "./nodes/prescriptornode"
import {NodeType} from "./nodes/types"
import {CAOType} from "../../../controller/datatag/types"
const debug = debugModule("flowqueries")

// These nodes are considered "demo only" and have restrictions on usage (eg. only demo users)
const DEMO_NODES = [
    "activation_node",
    "analytics_node",
    "category_reducer_node",
    "confabulator_node",
    "confabulation_node",
    "llmnode",
]

/**
 * Contains various methods for query items from the experiment flow
 */
export class FlowQueries {
    static getPredictorNodes(nodes: NodeType[]): PredictorNode[] {
        /*
        This function filters the predictor nodes
        from the graph and returns them
        */
        return FlowQueries.getNodesByType(nodes, "predictornode") as PredictorNode[]
    }

    static getPredictorNode(nodes: NodeType[], nodeID: string): PredictorNode {
        /*
        This function filters the predictor nodes
        from the graph and returns the one with the supplied ID, or undefined if not found
        */
        return FlowQueries.getNodesByType(nodes, "predictornode").find((node) => node.id === nodeID) as PredictorNode
    }

    static getPrescriptorNodes(nodes: NodeType[]): PrescriptorNode[] {
        /*
        This function filters the prescriptor nodes
        from the graph and returns them
        */
        return FlowQueries.getNodesByType(nodes, "prescriptornode") as PrescriptorNode[]
    }

    static getDataNodes(nodes: NodeType[]): DataSourceNode[] {
        /*
        This function returns all nodes of type "data" from the graph
        */
        return FlowQueries.getNodesByType(nodes, "datanode") as DataSourceNode[]
    }

    static getUncertaintyModelNodes(nodes: NodeType[]): ConfigurableNode[] {
        /*
        This function returns all nodes of type "uncertaintymodelnode" from the graph
        */
        return FlowQueries.getNodesByType(nodes, "uncertaintymodelnode") as ConfigurableNode[]
    }

    static extractCheckedFields(nodes, caoType: CAOType) {
        /*
        The function extracts all user-selected (checked) fields of the given CAOType from the
        relevant sub-nodes. It knows which nodes to search for each CAOType.
         */
        const parentNode =
            caoType === CAOType.CONTEXT || caoType === CAOType.ACTION
                ? "ParentPrescriptorState"
                : "ParentPredictorState"
        const caoTypeAsString = CAOType[caoType].toLowerCase()
        const checkedFields = []
        nodes &&
            nodes.forEach((node) => {
                const caoNode = node.data[parentNode].caoState[caoTypeAsString]
                Object.entries(caoNode).forEach((field) => {
                    if (field[1]) {
                        checkedFields.push(field[0])
                    }
                })
            })
        return checkedFields
    }

    static extractCheckedFieldsForNode(node: NodeType, caoType: CAOType): string[] {
        /*
       The function extracts all user-selected (checked) fields of the given CAOType from the
       given node. For example, "get all checked Actions for this Predictor".
        */
        const parentNode = node.type === "prescriptornode" ? "ParentPrescriptorState" : "ParentPredictorState"
        const caoTypeString = CAOType[caoType].toLowerCase()
        return Object.entries(node.data[parentNode].caoState[caoTypeString])
            .filter((e) => e[1] === true) // only checked items
            .map((e) => e[0])
    }

    static getNodeByID(nodes: NodeType[], nodeID: string): NodeType | undefined {
        /*
           Finds a node with the given NodeID in the supplied graph, and returns it, or empty array if not found
        */
        return nodes.find((node) => node.id === nodeID)
    }

    static getAllNodes(graph) {
        return graph.filter((e) => isNode(e))
    }

    static getAllEdges(graph) {
        return graph.filter((e) => isEdge(e))
    }

    static getElementTypeToUuidList(nodes: NodeType[], edges: EdgeType[]): Map<string, string[]> {
        /*
        Return a dictionary whose keys are graph element types
        and whose values are a sorted list of id (assumed uuid) strings.

        This dictionary is useful for creating (somewhat) predictable indexes
        on a per-element-type basis used for ids in testing.

        Note that more persistence-oriented work would need to be done for these ids
        to be consistent across different pages with operations performed on the graph.
        */

        const graph = [...nodes, ...edges]

        // Start with an empty dictionary
        const elementTypeToUuidList: Map<string, string[]> = new Map<string, string[]>()

        // Loop through each flow element.
        // Find out its type and start building a list of ids
        for (const element of graph) {
            // Always use strings for keys
            const elementType = String(element.type)

            // See if the list for the element type already exists.
            // Use that value if it exists already.
            let uuidList: string[] = []
            if (elementTypeToUuidList.has(elementType)) {
                uuidList = elementTypeToUuidList.get(elementType)
            }

            // Add to the uuidList and be sure the new list is in the dictionary
            uuidList.push(element.id)
            elementTypeToUuidList.set(elementType, uuidList)
        }

        // Now that we have the uuid list for each element type populated,
        // sort each list so that we have an initial index for each element
        // of each type.
        for (const key in elementTypeToUuidList) {
            if (Object.hasOwn(elementTypeToUuidList, key)) {
                // Get the list we have for the given key/type
                const uuidList = elementTypeToUuidList.get(key)

                // Sort it by uuid string
                uuidList.sort()
            }
        }

        debug({elementTypeToUuidList})

        return elementTypeToUuidList
    }

    static getIndexForElement(elementTypeToUuidList: Map<string, string[]>, element: NodeType): number {
        /*
        Given an elementTypeToUuidList dictionary (see method above)
        return the index of a given element.  This index is used for ids in testing.
        */

        // Defensive check
        if (!element) {
            return -1
        }

        debug({elementTypeToUuidList})

        // Default value if no element type in list
        let index = -1

        // First be sure the element type is even in the dictionary
        const elementType = String(element.type)
        if (elementTypeToUuidList.has(elementType)) {
            // Find the list for the appropriate element type
            const uuidList = elementTypeToUuidList.get(elementType)
            const elementId = element.id

            debug({elementId})

            // Find the uuid of the element in the list
            // Will return -1 if the id itself is not in the list.
            index = uuidList.indexOf(elementId)
        } else {
            debug({elementType})
        }

        debug({index})

        // Not in the dictionary
        return index
    }

    /**
     * Simple utility method to tell if a given predictor node has more than one outcome.
     * Useful for scenarios where we need to do things different for example for predictors with multi outcomes, like
     * not supporting uncertainty nodes for such predictors.
     * @param predictorNode The node to be tested
     * @return <code>boolean</code> value indicating whether the node has more than one outcome.
     */
    static hasMultipleOutcomes(predictorNode): boolean {
        return FlowQueries.extractCheckedFieldsForNode(predictorNode, CAOType.OUTCOME).length > 1
    }

    /**
     * Finds nodes of the given type in the supplied graph
     * @param nodes The graph to search
     * @param type The type of node to find
     * @return An array of nodes of the given type or empty array if none found
     */
    static getNodesByType(nodes: NodeType[], type: string): NodeType[] {
        return nodes?.filter((node) => node.type === type) as NodeType[]
    }

    /**
     * Returns true if the supplied graph contains any of the demo nodes
     * @param nodes The graph to search
     * @return <code>true</code> if the graph contains any of the demo nodes, <code>false</code> otherwise
     */
    static hasDemoNodes(nodes: NodeType[]) {
        return nodes?.some((node) => DEMO_NODES.includes(node.type))
    }
}

import {isEdge, isNode} from "react-flow-renderer";
import {CAOType} from "../../../controller/datatag/types";

/**
 * Contains various methods for query items from the experiment flow
 */
export class FlowQueries {

    static getPredictorNodes(graph) {
        /*
        This function filters the predictor nodes
        from the graph and returns them
        */
        return graph.filter(element => element.type === 'predictornode')
    }

    static getPredictorNode(graph, nodeID: string) {
        /*
        This function filters the predictor nodes
        from the graph and returns the one with the supplied ID, or undefined if not found
        */
        return graph.find(element => (element.type === 'predictornode' && element.id === nodeID))
    }

    static getPrescriptorNodes(graph) {
        /*
        This function filters the prescriptor nodes
        from the graph and returns them
        */
        return graph.filter(element => element.type === 'prescriptornode')
    }

    static getDataNodes(graph) {
        /*
        This function returns all nodes of type "data" from the graph
        */
        return graph.filter(element => element.type === 'datanode')
    }

    static getUncertaintyModelNodes(graph) {
        /*
        This function returns all nodes of type "uncertaintymodelnode" from the graph
        */
        return graph.filter(element => element.type === 'uncertaintymodelnode')
    }

    static extractCheckedFields(nodes, caoType: CAOType) {
        /*
        The function extracts all user-selected (checked) fields of the given CAOType from the
        relevant sub-nodes. It knows which nodes to search for each CAOType.
         */
        const parentNode = caoType == CAOType.CONTEXT || caoType == CAOType.ACTION ? "ParentPrescriptorState"
            : "ParentPredictorState"
        const caoTypeAsString = CAOType[caoType].toLowerCase()
        const checkedFields = []
        nodes && nodes.forEach(node => {
            const caoNode = node.data[parentNode].caoState[caoTypeAsString]
            Object.entries(caoNode).forEach(field => {
                if (field[1]) {
                    checkedFields.push(field[0])
                }
            })
        })
        return checkedFields
    }

    static extractCheckedFieldsForNode(node, caoType: CAOType): string[] {
        /*
       The function extracts all user-selected (checked) fields of the given CAOType from the
       given node. For example, "get all checked Actions for this Predictor".
        */
        const parentNode = node.type === "prescriptornode" ? "ParentPrescriptorState" : "ParentPredictorState"
        const caoTypeString = CAOType[caoType].toLowerCase()
        return Object.entries(node.data[parentNode].caoState[caoTypeString])
            .filter(e => e[1] === true) // only checked items
            .map(e => e[0])
    }

    static getNodeByID(graph, nodeID: string) {
        /*
           Finds a node with the given NodeID in the supplied graph, and returns it, or empty array if not found
        */
        return graph.find(element => element.id === nodeID)
    }

    static getAllNodes(graph) {
        return graph.filter(e => isNode(e))
    }

    static getAllEdges(graph) {
        return graph.filter(e => isEdge(e))
    }

    static getElementTypeToUuidList(graph) {
        /*
        Return a dictionary whose keys are graph element types
        and whose values are a sorted list of id (assumed uuid) strings.

        This dictionary is useful for creating (somewhat) predictable indexes
        on a per-element-type basis used for ids in testing.

        Note that more persistence-oriented work would need to be done for these ids
        to be consistent across different pages with operations performed on the graph.
        */

        // Start with an empty dictionary
        let elementTypeToUuidList: { [id: string]: string[]; } = {};

        // Loop through each flow element.
        // Find out its type and start building a list of ids
        for (const element of graph) {

            // See if the list for the element type already exists.
            // Use that value if it exists already.
            let uuidList: string[] = [];
            if (element.type in elementTypeToUuidList) {
                uuidList = elementTypeToUuidList[element.type];
            }

            // Add to the uuidList and be sure the new list is in the dictionary
            uuidList.push(element.id);
            elementTypeToUuidList[element.type] = uuidList;
        }

        // Now that we have the uuid list for each element type populated,
        // sort each list so that we have an initial index for each element
        // of each type.
        for (const key of elementTypeToUuidList.keys()) {

            // Get the list we have for the given key/type
            let uuidList = elementTypeToUuidList[key];

            // Sort it by uuid string
            uuidList = uuidList.sort((n1,n2) => {

                if (n1 > n2) {
                    return 1;
                }
                if (n1 < n2) {
                    return -1;
                }
                return 0;
            });

            // Put the sorted list back in the dictionary
            elementTypeToUuidList[key] = uuidList;
        }

        return elementTypeToUuidList;
    }

    static getIndexForElement(elementTypeToUuidList, element) {
        /*
        Given an elementTypeToUuidList dictionary (see method above)
        return the index of a given element.  This index is used for ids in testing.
        */

        // Default value if no element type in list
        let index = -1;

        // First be sure the element type is even in the dictionary
        if (element.type in elementTypeToUuidList) {

            // Find the list for the appropriate element type
            const uuidList = elementTypeToUuidList[element.type];

            // Find the uuid of the element in the list
            // Will return -1 if the id itself is not in the list.
            index = uuidList.indexOf(element.id);
        }

        // Not in the dictionary
        return index;
    }
}

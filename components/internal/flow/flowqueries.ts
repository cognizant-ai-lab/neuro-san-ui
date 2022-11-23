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
        return  graph.find(element => element.id === nodeID)
    }
}

import {NodeType} from "../components/internal/flow/nodes/types"
// Miscellaneous object transformation utilities

// Removes the first instance of "value" from array"arr", if found, and returns the modified
// array
export function removeItemOnce(arr, value) {
    const index = arr.indexOf(value)
    if (index > -1) {
        arr.splice(index, 1)
    }
    return arr
}

/*
 * This method consolidates the old flow schema with the new one
 * while also keeping backwards compatibility for
 * Predictor and Configurable Nodes
 */
export const consolidateFlow = (flowNodes) => {
    const consolidatedFlowNodes: NodeType[] = []
    flowNodes.forEach((node) => {
        const copyNode = structuredClone(node)

        const isLLMNode =
            node?.type === "uncertaintymodelnode" ||
            node?.type === "category_reducer_node" ||
            node?.type === "analytics_node" ||
            node?.type === "activation_node" ||
            node?.type === "confabulator_node" ||
            node?.type === "confabulation_node" ||
            node?.type === "llmnode"

        if (isLLMNode && !node?.data?.ParentNodeState?.params) {
            copyNode.data.ParentNodeState = {params: node.data.ParentNodeState}
        } else if (!node?.data?.ParentNodeState && node?.data?.ParentPredictorState) {
            copyNode.data.ParentNodeState = copyNode.data.ParentPredictorState

            if (node?.data?.ParentPredictorState?.predictorParams) {
                copyNode.data.ParentNodeState.params = node.data.ParentPredictorState.predictorParams
            }
        }

        consolidatedFlowNodes.push(copyNode)
    })
    return consolidatedFlowNodes
}

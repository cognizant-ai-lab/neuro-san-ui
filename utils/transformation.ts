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
            node?.type === "category_reducer_node" ||
            node?.type === "analytics_node" ||
            node?.type === "activation_node" ||
            node?.type === "confabulator_node" ||
            node?.type === "confabulation_node" ||
            node?.type === "llmnode"

        const isUncertaintyNode = node?.type === "uncertaintymodelnode"
        // Make sure nodes has valid params on ParentNodeState
        const hasParams =
            Boolean(copyNode?.data?.ParentNodeState?.params) &&
            Object.keys(copyNode?.data?.ParentNodeState?.params || {}).length > 0
        // For LLM Node conversion, if there are no params on the ParentNodeState
        // Populate params property on ParentNodeState with the current Params
        if (isLLMNode && !hasParams) {
            copyNode.data.ParentNodeState = {params: node.data.ParentNodeState}
            // For UncertaintyNodes, if there is no params on the ParentNodeState
            // Populate params propery on ParentNodeState with ParameterSet
        } else if (isUncertaintyNode && !hasParams) {
            // If ParameterSet exists in legacy node set the params
            if (node?.data?.ParameterSet) {
                copyNode.data.ParentNodeState = {params: node.data.ParameterSet}
                // Otherwise use ParentUncertaintyNodeState
            } else {
                copyNode.data.ParentNodeState = {params: node.data.ParentUncertaintyNodeState}
            }
            // For PredictorNodes, copy current predictorState params into
            // ParentNodeState params
        } else if (!node?.data?.ParentNodeState && node?.data?.ParentPredictorState && node?.type === "predictornode") {
            copyNode.data.ParentNodeState = copyNode.data.ParentPredictorState

            if (node?.data?.ParentPredictorState?.predictorParams) {
                copyNode.data.ParentNodeState.params = node.data.ParentPredictorState.predictorParams
            }
        }

        consolidatedFlowNodes.push(copyNode)
    })
    return consolidatedFlowNodes
}

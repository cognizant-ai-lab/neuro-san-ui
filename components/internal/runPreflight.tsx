import {FlowQueries} from "./flow/flowqueries"
import {MAX_ALLOWED_CATEGORIES} from "../../const"
import {DataSourceNode} from "./flow/nodes/datasourcenode"
import {NodeType} from "./flow/nodes/types"
import {DataTag, DataTagFieldCAOType} from "../../generated/metadata"
import {arraysEqual, commaListFromArray} from "../../utils/objects"
import {NotificationType, sendNotification} from "../notification"

/**
 * Called when user clicks the "start training" button. Does some sanity checks before allowing training to
 * proceed.
 *
 * @param flow The flow to be validated. In general this is the flow of the experiment the user is currently viewing/
 * editing.
 *
 * @return <code>true</code> if all checks pass and okay to proceed with training, otherwise <code>false</code>.
 */
export function checkValidity(flow: NodeType[]): boolean {
    // Must have at least one predictor
    const predictorNodes = FlowQueries.getPredictorNodes(flow)
    if (predictorNodes.length === 0) {
        sendNotification(
            NotificationType.warning,
            "Please add at least one Predictor and Prescriptor to this experiment before training."
        )
        return false
    }

    // Must have a prescriptor node or else it's not a LEAF experiment
    const prescriptorNodes = FlowQueries.getPrescriptorNodes(flow)
    if (!prescriptorNodes || prescriptorNodes.length === 0) {
        sendNotification(NotificationType.warning, "Please add a Prescriptor to this experiment before training.")
        return false
    }

    // Must have at least one action checked
    const hasAnyActionsChecked = prescriptorNodes.some((node) =>
        Object.values(node.data.ParentPrescriptorState.caoState.action).some((val) => val === true)
    )

    if (!hasAnyActionsChecked) {
        sendNotification(
            NotificationType.warning,
            "Please check (enable) at least one Action on a prescriptor before training."
        )
        return false
    }

    // Each predictor must have exactly one outcome checked
    const hasExactlyOneOutcomeChecked = predictorNodes.every(
        (node) =>
            // External data -- don't trust it to be a clean bool
            Object.values(node.data.ParentNodeState.caoState.outcome).filter((val) => val === true).length === 1
    )

    if (!hasExactlyOneOutcomeChecked) {
        sendNotification(
            NotificationType.warning,
            "Please check (enable) exactly one Outcome on each predictor before training."
        )
        return false
    }

    // Must have at least one context checked
    const hasAnyContextsChecked = predictorNodes.some((node) =>
        // External data -- don't trust it to be a clean bool
        Object.values(node.data.ParentNodeState.caoState.context).some((val) => val === true)
    )

    if (!hasAnyContextsChecked) {
        sendNotification(
            NotificationType.warning,
            "Please enable at least one Context on a predictor and a prescriptor before training."
        )
        return false
    }

    // Predictor Actions must match prescriptor Actions or training will fail
    const prescriptorActions = FlowQueries.extractCheckedFieldsForNode(prescriptorNodes[0], DataTagFieldCAOType.ACTION)
    for (const predictor of predictorNodes) {
        const predictorActions: string[] = FlowQueries.extractCheckedFieldsForNode(
            predictor,
            DataTagFieldCAOType.ACTION
        )
        if (!arraysEqual(prescriptorActions, predictorActions)) {
            const description = (
                <>
                    Predictor has: {commaListFromArray(predictorActions)}
                    <br id="predictor-has-br" />
                    Prescriptor has: {commaListFromArray(prescriptorActions)}
                </>
            )
            sendNotification(
                NotificationType.warning,
                "Please ensure checked Action inputs for all predictors match checked Action outputs " +
                    "for the prescriptor before training.",
                description
            )
            return false
        }
    }

    // Predictor Context must match prescriptor Context or training will fail
    const prescriptorContexts = FlowQueries.extractCheckedFieldsForNode(
        prescriptorNodes[0],
        DataTagFieldCAOType.CONTEXT
    )
    for (const predictor of predictorNodes) {
        const predictorContexts: string[] = FlowQueries.extractCheckedFieldsForNode(
            predictor,
            DataTagFieldCAOType.CONTEXT
        )
        if (!arraysEqual(prescriptorContexts, predictorContexts)) {
            const description = (
                <>
                    Predictor has: {commaListFromArray(predictorContexts)}
                    <br id="prescriptor-has-br" />
                    Prescriptor has: {commaListFromArray(prescriptorContexts)}
                </>
            )
            sendNotification(
                NotificationType.warning,
                "Please ensure checked Context inputs for all predictors match Context inputs " +
                    "for the prescriptor before training.",
                description
            )
            return false
        }
    }

    // Multiple predictors shouldn't predict the same outcomes
    const allOutcomes = predictorNodes
        .reduce((acc, node) => [...acc, FlowQueries.extractCheckedFieldsForNode(node, DataTagFieldCAOType.OUTCOME)], [])
        .flatMap((outcomes) => outcomes)
    const dupes = allOutcomes.filter((item, index) => allOutcomes.indexOf(item) !== index)
    if (dupes.length > 0) {
        const description = (
            <>
                The following outcome(s) is/are predicted by multiple predictors:
                <br id="dupes-list" />
                {commaListFromArray(dupes)}
            </>
        )
        sendNotification(
            NotificationType.warning,
            "Please ensure that each Outcome is only predicted by a single predictor. It is not valid to have " +
                "multiple predictors predicting the same outcome.",
            description
        )
        return false
    }

    // If any columns have NaNs, user needs to add
    // an LLM to fill in the blanks
    const dataNodes = FlowQueries.getDataNodes(flow)
    if (dataNodes && dataNodes.length === 1) {
        // Currently we only support a single datasource node
        const dataNode: DataSourceNode = dataNodes[0]
        const dataTag: DataTag = DataTag.fromJSON(dataNode.data.DataTag)

        // Store all checked fields from predictor actions and context so that preflight check can verify whether
        // any fields blocked by category reducer field or hasNaN fields are unchecked, which should enable training
        const checkedPredictorContextActions = new Set()
        for (const predictor of predictorNodes) {
            const predictorContexts: string[] = FlowQueries.extractCheckedFieldsForNode(
                predictor,
                DataTagFieldCAOType.CONTEXT
            )
            predictorContexts.forEach((context) => checkedPredictorContextActions.add(context))

            const predictorActions: string[] = FlowQueries.extractCheckedFieldsForNode(
                predictor,
                DataTagFieldCAOType.ACTION
            )
            predictorActions.forEach((action) => checkedPredictorContextActions.add(action))
        }
        const columnsWithNaNs = Object.keys(dataTag.fields).filter(
            (key) => dataTag.fields[key].hasNan && checkedPredictorContextActions.has(key)
        )

        const columnsWithTooManyCategories = Object.keys(dataTag.fields).filter(
            (key) =>
                dataTag.fields[key].valued === "CATEGORICAL" &&
                dataTag.fields[key].discreteCategoricalValues.length > MAX_ALLOWED_CATEGORIES &&
                checkedPredictorContextActions.has(key)
        )
        let validFlow = true

        if (columnsWithNaNs.length > 0) {
            // We have columns containing NaNs. Is there an LLM in the flow to rescue us?
            const hasConfabulatorNodes = FlowQueries.getNodesByType(flow, "confabulator_node")?.length > 0
            if (!hasConfabulatorNodes) {
                validFlow = false
                sendNotification(
                    NotificationType.warning,
                    "Some columns have NaN values which must be filled in prior to training. " +
                        "Please uncheck the following fields below from your predictor and prescriptor " +
                        "input/outcome (recommended) or add a confabulator LLM node to start training.",
                    `Fields with NaNs: ${commaListFromArray(columnsWithNaNs)}`
                )
            }
        }

        if (columnsWithTooManyCategories.length) {
            //We have Categorical columns with more than 20 categories. Add a category reduer node.
            const hasCategoryReducerNode = FlowQueries.getNodesByType(flow, "category_reducer_node")?.length > 0
            if (!hasCategoryReducerNode) {
                validFlow = false
                sendNotification(
                    NotificationType.warning,
                    `Some columns have Categorical values with greater than 
                    ${MAX_ALLOWED_CATEGORIES} categories. Please uncheck the fields below from
                    your predictor and prescriptor node input/outcome (recommended) or add a
                    category reducer LLM node to start training.`,
                    `Fields with too many categories: ${commaListFromArray(columnsWithTooManyCategories)}`
                )
            }
        }

        if (!validFlow) {
            return false
        }
    }

    // If we got here, all is well
    return true
}

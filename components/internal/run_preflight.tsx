import {FlowQueries} from "./flow/flowqueries"
import {NodeType} from "./flow/nodes/types"
import {MAX_ALLOWED_CATEGORIES} from "../../const"
import {CAOType} from "../../controller/datatag/types"
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

    // Each predictor must have at least one outcome checked
    const hasAnyOutcomesChecked = predictorNodes.every((node) =>
        // External data -- don't trust it to be a clean bool
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
        Object.values(node.data.ParentNodeState.caoState.outcome).some((val) => val === true)
    )

    if (!hasAnyOutcomesChecked) {
        sendNotification(
            NotificationType.warning,
            "Please check (enable) at least one Outcome on each predictor before training."
        )
        return false
    }

    // Must have at least one context checked
    const hasAnyContextsChecked = predictorNodes.some((node) =>
        // External data -- don't trust it to be a clean bool
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
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
    const prescriptorActions = FlowQueries.extractCheckedFieldsForNode(prescriptorNodes[0], CAOType.ACTION)
    for (const predictor of predictorNodes) {
        const predictorActions: string[] = FlowQueries.extractCheckedFieldsForNode(predictor, CAOType.ACTION)
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
    const prescriptorContexts = FlowQueries.extractCheckedFieldsForNode(prescriptorNodes[0], CAOType.CONTEXT)
    for (const predictor of predictorNodes) {
        const predictorContexts: string[] = FlowQueries.extractCheckedFieldsForNode(predictor, CAOType.CONTEXT)
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
        .reduce((acc, node) => [...acc, FlowQueries.extractCheckedFieldsForNode(node, CAOType.OUTCOME)], [])
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
        const dataNode = dataNodes[0]
        const dataTag = dataNode.data.DataTag

        // Store all checked fields from predictor actions and context so that preflight check can verify whether
        // any fields blocked by category reducer field or hasNaN fields are unchecked, which should enable training
        const checkedPredictorContextActions = new Set()
        for (const predictor of predictorNodes) {
            const predictorContexts: string[] = FlowQueries.extractCheckedFieldsForNode(predictor, CAOType.CONTEXT)
            predictorContexts.forEach((context) => checkedPredictorContextActions.add(context))

            const predictorActions: string[] = FlowQueries.extractCheckedFieldsForNode(predictor, CAOType.ACTION)
            predictorActions.forEach((action) => checkedPredictorContextActions.add(action))
        }
        const columnsWithNaNs = Object.keys(dataTag.fields).filter(
            (key) => dataTag.fields[key].has_nan && checkedPredictorContextActions.has(key)
        )
        const columnsWithTooManyCategories = Object.keys(dataTag.fields).filter(
            (key) =>
                dataTag.fields[key].valued === "CATEGORICAL" &&
                dataTag.fields[key].discrete_categorical_values.length > MAX_ALLOWED_CATEGORIES &&
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
                    "Some columns have NaN values which must be filled in prior to training. Please add a " +
                        "confabulator LLM node to continue",
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
                    ${MAX_ALLOWED_CATEGORIES} categories. Please add a category reducer LLM node to continue`,
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

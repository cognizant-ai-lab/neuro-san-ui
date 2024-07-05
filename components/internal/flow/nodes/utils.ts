import {ConfigurableNodeState} from "./generic/types"
import {DataTagField} from "../../../../generated/metadata"

export interface Outcomes {
    [key: string]: {
        outcome: boolean
        disabled: boolean
    }
}

const shouldDisableOutcome = (outcome, predictorType, fields) =>
    (fields?.[outcome]?.valued === "CONTINUOUS" && predictorType === "classifier") ||
    (fields?.[outcome]?.valued === "CATEGORICAL" && predictorType === "regressor")

/**
 * Include disabled property in outcomes object to be grayed out depending on predictor types
 *
 * @param parentNodeState {ParentNodeState}
 * @param fields {DataTagFields}
 * @returns Outcomes
 */
export const addDisabledPropertyToOutcomes = (
    parentNodeState: ConfigurableNodeState,
    fields: DataTagField
): Outcomes => {
    const result = {}
    for (const outcome in parentNodeState.caoState.outcome) {
        if (Object.hasOwn(parentNodeState.caoState.outcome, outcome)) {
            const shouldDisable = shouldDisableOutcome(outcome, parentNodeState.selectedPredictorType, fields)
            result[outcome] = {
                outcome: shouldDisable ? false : parentNodeState.caoState.outcome[outcome],
                disabled: shouldDisable,
            }
        }
    }

    return result
}

/*
Utilities for validating data tags etc.
 */

import {CAOType, DataTagFields} from "../../../controller/datatag/types"
import {NotificationType, sendNotification} from "../../../controller/notification"

// Sanity check on data tags before proceeding to creation or update
export function checkValidity(dataTagFields: DataTagFields): boolean {
    // Must have one or more designated Contexts
    const hasContexts = Object.values(dataTagFields).some((f) => f.esp_type === CAOType[CAOType.CONTEXT])
    if (!hasContexts) {
        sendNotification(
            NotificationType.warning,
            'One or more fields must be designated as ESP type "CONTEXT" to proceed'
        )
        return false
    }

    // Must have one or more designated Actions
    const hasActions = Object.values(dataTagFields).some((f) => f.esp_type === CAOType[CAOType.ACTION])
    if (!hasActions) {
        sendNotification(
            NotificationType.warning,
            'One or more fields must be designated as ESP type "ACTION" to proceed'
        )
        return false
    }

    // Must have one or more designated Outcomes
    const hasOutcomes = Object.values(dataTagFields).some((f) => f.esp_type === CAOType[CAOType.OUTCOME])
    if (!hasOutcomes) {
        sendNotification(
            NotificationType.warning,
            'One or more fields must be designated as ESP type "OUTCOME" to proceed'
        )
        return false
    }

    return true
}

/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {FC} from "react"

import {ConfirmationModal} from "./ConfirmationModal"
import {useWaitReminder} from "./useWaitReminder"

export const CONTINUE_WAITING_LABEL = "Continue waiting"
export const STOP_WAITING_LABEL = "Cancel"
export const WAIT_REMINDER_QUESTION = "Would you like to continue waiting or cancel?"

interface KeepWaitingPromptProps {
    /** What we're waiting on, as a sentence subject, e.g. `Publishing "Cailville Bakery"` */
    readonly activity: string
    /** How long to wait before asking the first time */
    readonly firstAskMs?: number
    readonly id: string
    readonly onStopWaiting: () => void
}

/**
 * While shown, asks every so often whether to keep waiting on something slow. Pressing Escape cancels, like it does
 * in the network editor.
 */
export const KeepWaitingPrompt: FC<KeepWaitingPromptProps> = ({activity, firstAskMs, id, onStopWaiting}) => {
    const {isAsking, keepWaiting} = useWaitReminder(true, {firstAskMs})

    return isAsking ? (
        <ConfirmationModal
            cancelBtnLabel={STOP_WAITING_LABEL}
            closeable={false}
            content={WAIT_REMINDER_QUESTION}
            handleCancel={onStopWaiting}
            handleOk={keepWaiting}
            id={id}
            okBtnLabel={CONTINUE_WAITING_LABEL}
            title={`${activity} is taking longer than expected.`}
        />
    ) : null
}

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

import {FC, useEffect, useState} from "react"

import {ConfirmationModal} from "./ConfirmationModal"

export const KEEP_WAITING_LABEL = "Keep waiting"
export const STOP_WAITING_LABEL = "Stop waiting"

interface KeepWaitingPromptProps {
    /** What we're waiting on, as a sentence subject, e.g. `Publishing "Cailville Bakery"` */
    readonly activity: string
    /** How long to wait before asking, and again after each "Keep waiting" */
    readonly askAfterMs: number
    readonly id: string
    readonly onStopWaiting: () => void
}

/**
 * While shown, asks every so often whether to keep waiting on something slow, like a browser does for a slow page.
 * Closing the prompt keeps waiting.
 */
export const KeepWaitingPrompt: FC<KeepWaitingPromptProps> = ({activity, askAfterMs, id, onStopWaiting}) => {
    const [isAsking, setIsAsking] = useState(false)

    useEffect(() => {
        if (isAsking) return undefined

        const timer = setTimeout(() => setIsAsking(true), askAfterMs)
        return () => clearTimeout(timer)
    }, [askAfterMs, isAsking])

    return isAsking ? (
        <ConfirmationModal
            cancelBtnLabel={KEEP_WAITING_LABEL}
            content={`${activity} is still in progress.`}
            handleCancel={() => setIsAsking(false)}
            handleOk={onStopWaiting}
            id={id}
            okBtnLabel={STOP_WAITING_LABEL}
            title="Keep waiting?"
        />
    ) : null
}

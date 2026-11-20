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

import {useCallback, useEffect, useState} from "react"

export const FIRST_WAIT_REMINDER_MS = 2 * 60_000
export const REPEATED_WAIT_REMINDER_MS = 60_000

interface WaitReminderOptions {
    /** How long to wait before asking the first time */
    readonly firstAskMs?: number
    /** How long to wait before asking again after the user chooses to keep waiting */
    readonly askAgainMs?: number
}

interface WaitReminder {
    /** Whether it's time to ask the user if they want to keep waiting */
    readonly isAsking: boolean
    /** Stops asking until the wait gets long again */
    readonly keepWaiting: () => void
}

/**
 * Tells when to ask whether to keep waiting on something slow, like a browser does for a slow page. The count starts
 * over each time `isWaiting` turns on.
 */
export const useWaitReminder = (
    isWaiting: boolean,
    {firstAskMs = FIRST_WAIT_REMINDER_MS, askAgainMs = REPEATED_WAIT_REMINDER_MS}: WaitReminderOptions = {}
): WaitReminder => {
    const [isAsking, setIsAsking] = useState(false)
    const [askAfterMs, setAskAfterMs] = useState(firstAskMs)
    const [wasWaiting, setWasWaiting] = useState(isWaiting)

    if (isWaiting !== wasWaiting) {
        setWasWaiting(isWaiting)
        setIsAsking(false)
        setAskAfterMs(firstAskMs)
    }

    useEffect(() => {
        if (!isWaiting || isAsking) return undefined

        const timer = setTimeout(() => setIsAsking(true), askAfterMs)
        return () => clearTimeout(timer)
    }, [askAfterMs, isAsking, isWaiting])

    const keepWaiting = useCallback(() => {
        setIsAsking(false)
        setAskAfterMs(askAgainMs)
    }, [askAgainMs])

    return {isAsking: isWaiting && isAsking, keepWaiting}
}

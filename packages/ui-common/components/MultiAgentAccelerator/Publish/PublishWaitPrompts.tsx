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

import {ASK_TO_KEEP_WAITING_MS} from "./Publish"
import {Publishing, PublishStatus, usePublishStore} from "../../../state/Publish"
import {KeepWaitingPrompt} from "../../Common/KeepWaitingPrompt"

/**
 * Asks every few minutes whether to keep waiting on each network that's publishing. Lives on the page rather than in
 * a publish button, so the question stays with its network when the user selects another one.
 */
export const PublishWaitPrompts: FC = () => {
    const networks = usePublishStore((state) => state.networks)

    return Object.entries(networks)
        .filter((entry): entry is [string, Publishing] => entry[1].status === PublishStatus.Publishing)
        .map(([networkId, {displayName, waiting}]) => (
            <KeepWaitingPrompt
                activity={`Publishing "${displayName}"`}
                askAfterMs={ASK_TO_KEEP_WAITING_MS}
                id={`publish-wait-${networkId}`}
                key={networkId}
                onStopWaiting={() => waiting.abort()}
            />
        ))
}

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

import {PublishTarget} from "./Publish"
import {ConfirmationModal} from "../../Common/ConfirmationModal"

export const PUBLIC_ACCESS_WARNING = "Anyone with the link can see and use it. There's no sign-in or access control."

interface PublishConfirmationProps {
    readonly displayName: string
    readonly id: string
    readonly onCancel: () => void
    readonly onConfirm: () => void
    readonly target: PublishTarget
}

/**
 * Asks before publishing, naming where it goes and warning that it'll be public.
 */
export const PublishConfirmation: FC<PublishConfirmationProps> = ({displayName, id, onCancel, onConfirm, target}) => (
    <ConfirmationModal
        content={
            `"${displayName}" will be published to ${target.serverUrl} ` +
            `under the org "${target.orgName}". ${PUBLIC_ACCESS_WARNING}`
        }
        handleCancel={onCancel}
        handleOk={onConfirm}
        id={id}
        okBtnLabel="Publish"
        title="Publish this network?"
    />
)

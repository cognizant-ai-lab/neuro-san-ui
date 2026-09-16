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

import {FC, ReactNode} from "react"

import {ConfirmationModal} from "../Common/ConfirmationModal"

export interface ByokUnsavedChangesModalProps {
    /** Custom content to display in the modal body. */
    readonly content?: ReactNode
    /** Base element ID for DOM and testing references. */
    readonly id: string
    /** Whether the modal is open. Defaults to true. */
    readonly isOpen?: boolean
    /** Callback when user chooses to discard unsaved changes. */
    readonly onDiscard: () => void
    /** Callback when user chooses to save unsaved changes. */
    readonly onSave: () => void
}

/**
 * Confirmation modal displayed when closing a dialog with unsaved BYOK API key changes.
 * Offers options to save changes or discard them before closing.
 *
 * @param props Component properties
 * @param props.content Custom modal content, or default explanation if omitted
 * @param props.id Base ID for the modal
 * @param props.isOpen Whether the modal is currently open
 * @param props.onDiscard Callback to discard unsaved changes and proceed
 * @param props.onSave Callback to save unsaved changes and proceed
 * @return Confirmation modal element, or null if not open
 */
export const ByokUnsavedChangesModal: FC<ByokUnsavedChangesModalProps> = ({
    content,
    id,
    isOpen = true,
    onDiscard,
    onSave,
}) => {
    if (!isOpen) {
        return null
    }

    return (
        <ConfirmationModal
            cancelBtnLabel="Discard changes"
            closeable={false}
            content={
                content ?? (
                    <p>You have unsaved edits. Are you sure you want to discard your changes and close the dialog?</p>
                )
            }
            handleCancel={onDiscard}
            handleOk={onSave}
            id={`${id}-unsaved-changes-modal`}
            maskCloseable={false}
            okBtnLabel="Save changes"
            title="Unsaved Changes"
        />
    )
}

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

import Checkbox from "@mui/material/Checkbox"
import FormControlLabel from "@mui/material/FormControlLabel"
import Typography from "@mui/material/Typography"
import {FC, useState} from "react"

import {PublishTarget} from "./Publish"
import {ConfirmationModal} from "../../Common/ConfirmationModal"

export const PUBLIC_ACCESS_WARNING = "Anyone with the link can see and use it. There's no sign-in or access control."
export const REFRESH_THEME_LABEL = "Recreate theme"

interface PublishConfirmationProps {
    readonly displayName: string
    readonly id: string
    /** Republishing replaces what's published under the network's name, and can recreate its theme */
    readonly isRepublish: boolean
    readonly onCancel: () => void
    readonly onConfirm: (refreshTheme: boolean) => void
    readonly target: PublishTarget
}

/**
 * Asks before publishing or republishing, naming where it goes and warning that it'll be public. Republishing also
 * offers to recreate the theme instead of keeping the one the server made before.
 */
export const PublishConfirmation: FC<PublishConfirmationProps> = ({
    displayName,
    id,
    isRepublish,
    onCancel,
    onConfirm,
    target,
}) => {
    const [refreshTheme, setRefreshTheme] = useState(false)

    const message = isRepublish
        ? `The published version of "${displayName}" on ${target.serverUrl} under the org "${target.orgName}" ` +
          "will be replaced with this one."
        : `"${displayName}" will be published to ${target.serverUrl} under the org "${target.orgName}".`

    return (
        <ConfirmationModal
            content={
                <>
                    <Typography variant="body2">{`${message} ${PUBLIC_ACCESS_WARNING}`}</Typography>
                    {isRepublish && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={refreshTheme}
                                    id={`${id}-refresh-theme`}
                                    onChange={(e) => setRefreshTheme(e.target.checked)}
                                    size="small"
                                />
                            }
                            label={REFRESH_THEME_LABEL}
                            slotProps={{typography: {variant: "body2"}}}
                            sx={{mt: 1}}
                        />
                    )}
                </>
            }
            handleCancel={onCancel}
            handleOk={() => onConfirm(refreshTheme)}
            id={id}
            okBtnLabel={isRepublish ? "Republish" : "Publish"}
            title={isRepublish ? "Republish this network?" : "Publish this network?"}
        />
    )
}

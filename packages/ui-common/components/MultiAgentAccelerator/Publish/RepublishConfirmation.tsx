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
import {PUBLIC_ACCESS_WARNING} from "./PublishConfirmation"
import {ConfirmationModal} from "../../Common/ConfirmationModal"

export const REFRESH_THEME_LABEL = "Make a new theme"

interface RepublishConfirmationProps {
    readonly displayName: string
    readonly id: string
    readonly onCancel: () => void
    readonly onConfirm: (refreshTheme: boolean) => void
    readonly target: PublishTarget
}

/**
 * Asks before republishing, which replaces what's published under the network's name, and offers to make a new theme
 * instead of keeping the one the server made before.
 */
export const RepublishConfirmation: FC<RepublishConfirmationProps> = ({
    displayName,
    id,
    onCancel,
    onConfirm,
    target,
}) => {
    const [refreshTheme, setRefreshTheme] = useState(false)

    return (
        <ConfirmationModal
            content={
                <>
                    <Typography variant="body2">
                        {`The published version of "${displayName}" on ${target.serverUrl} under the org ` +
                            `"${target.orgName}" will be replaced with this one. ${PUBLIC_ACCESS_WARNING}`}
                    </Typography>
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
                </>
            }
            handleCancel={onCancel}
            handleOk={() => onConfirm(refreshTheme)}
            id={id}
            okBtnLabel="Republish"
            title="Republish this network?"
        />
    )
}

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
import {FC, useEffect, useState} from "react"

import {findOtherPublished, PublishNetwork, PublishTarget} from "./Publish"
import {PublishedNetwork} from "../../../controller/publish/Publish"
import {ConfirmationModal} from "../../Common/ConfirmationModal"

export const PUBLIC_ACCESS_WARNING = "Anyone with the link can see and use it. There's no sign-in or access control."
export const OTHER_PUBLISHED_WARNING = "but not from this browser, so it may be someone else's. Publishing replaces it."
export const REFRESH_THEME_LABEL = "Recreate theme"

interface PublishConfirmationProps {
    readonly displayName: string
    readonly id: string
    /** Republishing replaces what's published under the network's name, and can recreate its theme */
    readonly isRepublish: boolean
    readonly network: PublishNetwork
    readonly onCancel: () => void
    readonly onConfirm: (refreshTheme: boolean) => void
    readonly target: PublishTarget
}

/**
 * Asks before publishing or republishing, naming where it goes and warning that it'll be public, and that it would
 * replace a network someone else may have published under the same name. Republishing also offers to recreate the
 * theme instead of keeping the one the server made before.
 */
export const PublishConfirmation: FC<PublishConfirmationProps> = ({
    displayName,
    id,
    isRepublish,
    network: {id: networkId, name: networkName},
    onCancel,
    onConfirm,
    target,
}) => {
    const {serverUrl, orgName} = target
    const [refreshTheme, setRefreshTheme] = useState(false)
    // A network this browser didn't publish, under the same name and org, which publishing would replace. Undefined
    // until the server says.
    const [otherPublished, setOtherPublished] = useState<PublishedNetwork | null>()

    useEffect(() => {
        void findOtherPublished({id: networkId, name: networkName}, {serverUrl, orgName}).then(setOtherPublished)
    }, [networkId, networkName, orgName, serverUrl])

    // Shown once the server has said, so the warning is there before anyone can confirm
    if (otherPublished === undefined) return null

    const otherPublishedMessage =
        otherPublished &&
        `A network named "${networkName}" is already published under the org "${target.orgName}"` +
            `${otherPublished.url ? ` at ${otherPublished.url}` : ""}, ${OTHER_PUBLISHED_WARNING}`

    const message = isRepublish
        ? `The published version of "${displayName}" on ${target.serverUrl} under the org "${target.orgName}" ` +
          "will be replaced with this one."
        : `"${displayName}" will be published to ${target.serverUrl} under the org "${target.orgName}".`

    return (
        <ConfirmationModal
            content={
                <>
                    <Typography variant="body2">{`${message} ${PUBLIC_ACCESS_WARNING}`}</Typography>
                    {otherPublishedMessage && (
                        <Typography
                            sx={{color: "var(--bs-warning)", mt: 1}}
                            variant="body2"
                        >
                            {otherPublishedMessage}
                        </Typography>
                    )}
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

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

import PublicIcon from "@mui/icons-material/Public"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import {FC, useState} from "react"

import {openInNewTab, publish, PUBLISH_SETTINGS_REQUIRED_MESSAGE} from "./Publish"
import {PublishConfirmation} from "./PublishConfirmation"
import {usePublishTarget} from "./usePublishTarget"
import {useEnvironmentStore} from "../../../state/Environment"
import {PublishStatus, usePublishServerUrl, usePublishStore} from "../../../state/Publish"
import {useTempNetworksStore} from "../../../state/TemporaryNetworks"

interface PublishIconButtonProps {
    /** The network's name as people read it, for the confirmation */
    readonly displayName: string
    readonly id: string
    /** An expired network can't be published, but its live site still opens */
    readonly isExpired: boolean
    /** The temporary network's id, which its name and HOCON are looked up by */
    readonly networkId: string
}

/**
 * Small globe button for publishing a network from the sidebar. Publishes after asking, spins while publishing, and
 * turns green once the network is live, when it opens the live site instead.
 */
export const PublishIconButton: FC<PublishIconButtonProps> = ({displayName, id, isExpired, networkId}) => {
    const enablePublishing = useEnvironmentStore((state) => state.enablePublishing)
    const publishServerUrl = usePublishServerUrl()
    const network = useTempNetworksStore((state) =>
        state.tempNetworks.find((tempNetwork) => tempNetwork.agentInfo.agent_name === networkId)
    )
    const networkName = network?.agentNetworkName
    const hocon = network?.networkHocon
    const publishStatus = usePublishStore((state) => state.networks[networkId]?.status)
    const publishedUrl = usePublishStore((state) => {
        const publishState = state.networks[networkId]
        return publishState?.status === PublishStatus.Published ? publishState.url : null
    })
    const target = usePublishTarget(networkId, networkName)

    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    const getLabel = () => {
        if (publishedUrl) return "View live"
        if (publishStatus === PublishStatus.Publishing) return "Publishing..."
        if (isExpired) return "Expired"
        return target ? "Publish" : PUBLISH_SETTINGS_REQUIRED_MESSAGE
    }

    const label = getLabel()
    const isPublishing = publishStatus === PublishStatus.Publishing

    if (!enablePublishing || !publishServerUrl || !networkName || !hocon) return null

    return (
        <>
            <Tooltip title={label}>
                {/* A disabled button doesn't fire the hover events the tooltip needs, so it gets a wrapper */}
                <span>
                    <IconButton
                        aria-label={label}
                        disabled={!publishedUrl && (isExpired || !target)}
                        id={id}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (publishedUrl) {
                                openInNewTab(publishedUrl)
                            } else {
                                setIsConfirmOpen(true)
                            }
                        }}
                        loading={isPublishing}
                        size="small"
                        sx={{
                            color: "var(--bs-secondary)",
                            p: 0,
                            "&:hover": {color: "var(--bs-secondary-dark)"},
                            "&.Mui-disabled": {opacity: isPublishing ? 1 : 0.3},
                            // The app's global CSS keeps icons colored, so hide the globe behind the loading spinner
                            "&.MuiIconButton-loading .MuiSvgIcon-root": {visibility: "hidden"},
                        }}
                    >
                        {/* Colored on the icon itself, since the app's global CSS colors icons inside buttons */}
                        <PublicIcon sx={{fontSize: "0.75rem", ...(publishedUrl && {color: "success.main"})}} />
                    </IconButton>
                </span>
            </Tooltip>
            {isConfirmOpen && target && (
                // The dialog is a portal, but its clicks still bubble up the React tree to the sidebar item, which
                // would select the network
                <Box
                    component="span"
                    onClick={(e) => e.stopPropagation()}
                >
                    <PublishConfirmation
                        displayName={displayName}
                        id={`${id}-confirm`}
                        onCancel={() => setIsConfirmOpen(false)}
                        onConfirm={() => {
                            setIsConfirmOpen(false)
                            void publish({id: networkId, name: networkName}, hocon, target)
                        }}
                        target={target}
                    />
                </Box>
            )}
        </>
    )
}

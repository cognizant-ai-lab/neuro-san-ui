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

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import PublicIcon from "@mui/icons-material/Public"
import Button from "@mui/material/Button"
import ButtonGroup from "@mui/material/ButtonGroup"
import CircularProgress from "@mui/material/CircularProgress"
import Popover from "@mui/material/Popover"
import Tooltip from "@mui/material/Tooltip"
import {FC, ReactNode, useState} from "react"

import {
    downloadBundle,
    openInNewTab,
    publish,
    PUBLISH_SETTINGS_REQUIRED_MESSAGE,
    PublishNetwork,
    PublishTarget,
    showPublishResult,
    unpublish,
} from "./Publish"
import {PublishConfirmation} from "./PublishConfirmation"
import {PublishPanel} from "./PublishPanel"
import {usePublishTarget} from "./usePublishTarget"
import {Published, PublishStatus, usePublishStore} from "../../../state/Publish"
import {ConfirmationModal} from "../../Common/ConfirmationModal"
import {NotificationType, sendNotification} from "../../Common/notification"

export const SHOW_DETAILS_LABEL = "Show publish details"

interface PublishButtonProps {
    /** The network's name as people read it, for the confirmation */
    readonly displayName: string
    readonly hocon: string
    readonly id: string
    /** The network's id in the app, which its publish state is kept under */
    readonly networkId: string
    /** The agent network name, which it's published under */
    readonly networkName: string
}

interface MainAction {
    readonly color: "primary" | "success"
    readonly icon: ReactNode
    readonly handleClick: () => void
    readonly label: string
}

/**
 * Split button for publishing a network: "Publish", then "Publishing..." while it goes live, then "View live", and
 * "Publish" again once it's unpublished. The dropdown opens a panel with the progress, or the live URL with Download
 * Bundle, Republish and Unpublish.
 */
export const PublishButton: FC<PublishButtonProps> = ({displayName, hocon, id, networkId, networkName}) => {
    const publishState = usePublishStore((state) => state.networks[networkId])
    const target = usePublishTarget(networkId, networkName)

    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
    const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false)
    const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false)
    // The live network waiting on the user to confirm unpublishing it
    const [networkToUnpublish, setNetworkToUnpublish] = useState<Published | null>(null)

    const network: PublishNetwork = {id: networkId, name: networkName}

    const handlePublish = async (publishTarget: PublishTarget, refreshTheme: boolean) => {
        setIsPanelOpen(true)
        try {
            showPublishResult(networkName, await publish(network, hocon, publishTarget, refreshTheme))
        } finally {
            setIsPanelOpen(false)
        }
    }

    const handleUnpublish = async (published: Published) => {
        try {
            const {error} = await unpublish(network, published)
            if (error) {
                sendNotification(NotificationType.error, `Failed to unpublish "${networkName}".`, error)
            }
        } finally {
            setIsPanelOpen(false)
        }
    }

    const getMainAction = (): MainAction => {
        switch (publishState?.status) {
            case PublishStatus.Publishing:
                return {
                    color: "primary",
                    icon: (
                        <CircularProgress
                            color="inherit"
                            size="1rem"
                        />
                    ),
                    label: "Publishing...",
                    handleClick: () => setIsPanelOpen(true),
                }
            case PublishStatus.Published:
                return {
                    color: "success",
                    icon: <OpenInNewIcon />,
                    label: "View live",
                    handleClick: () => openInNewTab(publishState.url),
                }
            case PublishStatus.Unpublished:
            default:
                return {
                    color: "primary",
                    icon: <PublicIcon />,
                    label: "Publish",
                    handleClick: () => setIsConfirmOpen(true),
                }
        }
    }

    const mainAction = getMainAction()
    const isPublishBlocked = publishState?.status !== PublishStatus.Publishing && !target

    return (
        <>
            <ButtonGroup
                color={mainAction.color}
                id={id}
                ref={setAnchorEl}
                size="small"
                // White text on green (the theme's contrast text is dark there), and icons that follow the text color
                sx={{
                    "& .MuiButton-root:not(.Mui-disabled)": {color: "common.white"},
                    "& .MuiSvgIcon-root": {color: "inherit"},
                }}
                variant="contained"
            >
                <Tooltip title={isPublishBlocked ? PUBLISH_SETTINGS_REQUIRED_MESSAGE : ""}>
                    {/* A disabled button doesn't fire the hover events the tooltip needs, so it gets a wrapper */}
                    <span>
                        <Button
                            disabled={isPublishBlocked}
                            id={`${id}-main`}
                            onClick={mainAction.handleClick}
                            startIcon={mainAction.icon}
                            sx={{whiteSpace: "nowrap"}}
                        >
                            {mainAction.label}
                        </Button>
                    </span>
                </Tooltip>
                {publishState && (
                    <Button
                        aria-expanded={isPanelOpen}
                        aria-label={SHOW_DETAILS_LABEL}
                        id={`${id}-toggle`}
                        onClick={() => setIsPanelOpen((isOpen) => !isOpen)}
                    >
                        <KeyboardArrowDownIcon sx={{fontSize: 18}} />
                    </Button>
                )}
            </ButtonGroup>
            {publishState && (
                <Popover
                    anchorEl={anchorEl}
                    anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                    onClose={() => setIsPanelOpen(false)}
                    open={isPanelOpen}
                    slotProps={{paper: {sx: {mt: 1}}}}
                    transformOrigin={{vertical: "top", horizontal: "right"}}
                >
                    <PublishPanel
                        publishState={publishState}
                        id={`${id}-panel`}
                        onDownloadBundle={(published) => void downloadBundle(network, published)}
                        onRepublish={() => {
                            setIsPanelOpen(false)
                            setIsConfirmOpen(true)
                        }}
                        onUnpublish={setNetworkToUnpublish}
                    />
                </Popover>
            )}
            {isConfirmOpen && target && (
                <PublishConfirmation
                    displayName={displayName}
                    id={`${id}-confirm`}
                    hasTheme={Boolean(publishState)}
                    isRepublish={publishState?.status === PublishStatus.Published}
                    onCancel={() => setIsConfirmOpen(false)}
                    onConfirm={(refreshTheme) => {
                        setIsConfirmOpen(false)
                        void handlePublish(target, refreshTheme)
                    }}
                    target={target}
                />
            )}
            {networkToUnpublish && (
                <ConfirmationModal
                    content={
                        `"${displayName}" will be taken offline at ${networkToUnpublish.url}. ` +
                        "Anyone using the link will lose access."
                    }
                    handleCancel={() => setNetworkToUnpublish(null)}
                    handleOk={() => {
                        setNetworkToUnpublish(null)
                        void handleUnpublish(networkToUnpublish)
                    }}
                    id={`${id}-unpublish-confirm`}
                    okBtnLabel="Unpublish"
                    title="Unpublish this network?"
                />
            )}
        </>
    )
}

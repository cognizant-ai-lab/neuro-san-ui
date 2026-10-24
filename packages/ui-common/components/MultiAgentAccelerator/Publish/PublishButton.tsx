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

import {openInNewTab, publish, PUBLISH_SETTINGS_REQUIRED_MESSAGE, PublishTarget, unpublish} from "./Publish"
import {PublishConfirmation} from "./PublishConfirmation"
import {PublishPanel} from "./PublishPanel"
import {usePublishTarget} from "./usePublishTarget"
import {Published, PublishStatus, usePublishStore} from "../../../state/Publish"
import {ConfirmationModal} from "../../Common/ConfirmationModal"

export const SHOW_DETAILS_LABEL = "Show publish details"

interface PublishButtonProps {
    /** The network's name as people read it, for the confirmation */
    readonly displayName: string
    readonly hocon: string
    readonly id: string
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
 * Split button for publishing a network: "Publish", then "Publishing..." while it goes live, then "View live". Once
 * it's unpublished it says "Republish", since the server keeps it. The dropdown opens a panel with the progress, or the
 * live URL with Republish and Unpublish.
 */
export const PublishButton: FC<PublishButtonProps> = ({displayName, hocon, id, networkName}) => {
    const publishState = usePublishStore((state) => state.networks[networkName])
    const target = usePublishTarget(networkName)

    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    // The live network waiting on the user to confirm unpublishing it
    const [networkToUnpublish, setNetworkToUnpublish] = useState<Published | null>(null)

    const handlePublish = async (publishTarget: PublishTarget, refreshTheme: boolean) => {
        setIsPanelOpen(true)
        await publish(networkName, hocon, publishTarget, refreshTheme)
        setIsPanelOpen(false)
    }

    const handleUnpublish = async (published: Published) => {
        await unpublish(networkName, published)
        setIsPanelOpen(false)
    }

    const getMainAction = (): MainAction => {
        if (publishState?.status === PublishStatus.Publishing) {
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
        }

        if (publishState?.status === PublishStatus.Published) {
            return {
                color: "success",
                icon: <OpenInNewIcon />,
                label: "View live",
                handleClick: () => openInNewTab(publishState.url),
            }
        }

        return {
            color: "primary",
            icon: <PublicIcon />,
            label: publishState ? "Republish" : "Publish",
            handleClick: () => setIsConfirmOpen(true),
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
                    isRepublish={Boolean(publishState)}
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

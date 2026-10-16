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
import {FC, ReactNode, useState} from "react"

import {DeployPanel} from "./DeployPanel"
import {useNetworkDeployment} from "./useNetworkDeployment"
import {DeploymentStatus} from "../../../state/Deployments"
import {NotificationType, sendNotification} from "../../Common/notification"

export const PUBLISHED_MESSAGE = "Published — opened in a new tab"
export const PUBLISHED_TAB_BLOCKED_MESSAGE = "Published — click View live to open it"
export const SHOW_DETAILS_LABEL = "Show publish details"

interface DeployButtonProps {
    readonly id: string
    readonly networkName: string
}

interface MainAction {
    readonly color: "primary" | "success"
    readonly icon: ReactNode
    readonly handleClick: () => void
    readonly label: string
}

/**
 * Opens a URL in a new tab, cut off from this page.
 * @returns Whether the tab opened. False when the browser blocked it as a popup.
 * @note Sets `opener` by hand because the "noopener" feature makes window.open always return null, which would hide
 * whether the tab opened.
 */
const openInNewTab = (url: string): boolean => {
    const tab = window.open(url, "_blank")
    if (!tab) return false

    tab.opener = null
    return true
}

/**
 * Split button for publishing a network: "Publish", then "Publishing..." while it deploys, then "View live". The
 * dropdown opens a panel with the deploy's progress, live URL and technical details.
 */
export const DeployButton: FC<DeployButtonProps> = ({id, networkName}) => {
    const {deployment, publish, unpublish} = useNetworkDeployment(networkName)

    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
    const [isPanelOpen, setIsPanelOpen] = useState(false)

    const handlePublish = async () => {
        setIsPanelOpen(true)
        const url = await publish()
        setIsPanelOpen(false)

        if (url) {
            const message = openInNewTab(url) ? PUBLISHED_MESSAGE : PUBLISHED_TAB_BLOCKED_MESSAGE
            sendNotification(NotificationType.success, message, "", {
                vertical: "bottom",
                horizontal: "center",
            })
        }
    }

    const handleUnpublish = async () => {
        await unpublish()
        setIsPanelOpen(false)
    }

    const getMainAction = (): MainAction => {
        switch (deployment?.status) {
            case DeploymentStatus.Publishing:
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
            case DeploymentStatus.Live:
                return {
                    color: "success",
                    icon: <OpenInNewIcon />,
                    label: "View live",
                    handleClick: () => openInNewTab(deployment.url),
                }
            default:
                return {
                    color: "primary",
                    icon: <PublicIcon />,
                    label: "Publish",
                    handleClick: handlePublish,
                }
        }
    }

    const mainAction = getMainAction()

    return (
        <>
            <ButtonGroup
                color={mainAction.color}
                id={id}
                ref={setAnchorEl}
                size="small"
                // The theme's contrast text on the green success color is dark, so set white for every state
                sx={{"& .MuiButton-root, & .MuiSvgIcon-root": {color: "common.white"}}}
                variant="contained"
            >
                <Button
                    id={`${id}-main`}
                    onClick={mainAction.handleClick}
                    startIcon={mainAction.icon}
                    sx={{whiteSpace: "nowrap"}}
                >
                    {mainAction.label}
                </Button>
                {deployment && (
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
            {deployment && (
                <Popover
                    anchorEl={anchorEl}
                    anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                    onClose={() => setIsPanelOpen(false)}
                    open={isPanelOpen}
                    slotProps={{paper: {sx: {mt: 1}}}}
                    transformOrigin={{vertical: "top", horizontal: "right"}}
                >
                    <DeployPanel
                        deployment={deployment}
                        id={`${id}-panel`}
                        onUnpublish={handleUnpublish}
                    />
                </Popover>
            )}
        </>
    )
}

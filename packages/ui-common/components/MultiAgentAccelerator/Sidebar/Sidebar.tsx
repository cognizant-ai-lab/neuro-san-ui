/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

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
import AddBoxRounded from "@mui/icons-material/AddBoxRounded"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import {keyframes, styled} from "@mui/material/styles"
import Tooltip, {tooltipClasses, TooltipProps} from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {RichTreeView, RichTreeViewSlots} from "@mui/x-tree-view/RichTreeView"
import httpStatus from "http-status"
import {LayoutGroup} from "motion/react"
import {FC, useEffect, useState} from "react"

import {AgentNetworkNodeProps, AgentNetworkTreeItem} from "./AgentNetworkTreeItem"
import {buildTreeViewItems, findTreeItemById} from "./TreeBuilder"
import {testConnection, TestConnectionResult} from "../../../controller/agent/Agent"
import {NetworkIconSuggestions} from "../../../controller/Types/NetworkIconSuggestions"
import {AgentInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {useSettingsStore} from "../../../state/Settings"
import {TemporaryNetwork} from "../../../state/TemporaryNetworks"
import {getSheen, SHEEN_FONT_DISPLAY, SHEEN_RADIUS} from "../../../Theme/sheen"
import {StatusLight} from "../../Common/StatusLight"
import {AGENT_NETWORK_DESIGNER_ID, TEMPORARY_NETWORK_FOLDER} from "../const"

//#region Constants

// Animation for the sparkle effect when a new temporary network is added.
const sparkle = keyframes`
    0% {
        background-position: 0% 50%;
        opacity: 1;
    }
    10% {
        background-position: 33% 50%;
        opacity: 1;
    }
    20% {
        background-position: 66% 50%;
        opacity: 1;
    }
    30% {
        background-position: 100% 50%;
        opacity: 1;
    }
    60% {
        background-position: 100% 50%;
        opacity: 1;
    }
    80% {
        background-position: 100% 50%;
        opacity: 0.7;
    }
    90% {
        background-position: 100% 50%;
        opacity: 0.4;
    }
    100% {
        background-position: 100% 50%;
        opacity: 0.25;
    }
`
// Name for sparkle animation CSS class
export const SPARKLE_HIGHLIGHT_CLASS = "sparkle-highlight"

const EMPTY_ARRAY: TemporaryNetwork[] = []

// Interval for pinging the Neuro-san server to check if it's online, in milliseconds
const NEURO_SAN_PING_INTERVAL_MS = 30_000

//#endregion: Constants

//#region: Styled Components

// Styled component for Sidebar aside element, including styles for the sparkle highlight animation
// when a new temporary network is added.
// The aside fills the floating glass card that hosts it (see FloatingPanel in the workspace). The heading stays put
// and only the networks tree scrolls, so the heading needs no opaque fill of its own (which would otherwise paint
// over the card's rounded corners and gradient border).
const SidebarAside = styled("aside")(({theme}) => ({
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),

    [`& .${SPARKLE_HIGHLIGHT_CLASS}`]: {
        // Sweep through the sheen accent gradient and back
        background: `linear-gradient(90deg, ${getSheen(theme).gradientStart}, ${getSheen(theme).gradientEnd}, ${
            (theme.vars ?? theme).palette.info.main
        }, ${getSheen(theme).gradientStart})`,
        backgroundSize: "400% 100%",
        animation: `${sparkle} 5s ease`,
        backgroundClip: "padding-box",
        borderRadius: `${SHEEN_RADIUS}px`,
        opacity: 1,
    },
}))

// Styled component for the sidebar heading, which sits above the scrolling networks tree.
const SidebarHeading = styled("h2")(({theme}) => ({
    alignItems: "center",
    borderBottomColor: getSheen(theme).glassBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    display: "flex",
    flexShrink: 0,
    fontFamily: SHEEN_FONT_DISPLAY,
    fontSize: "1.25rem",
    fontWeight: 500,
    justifyContent: "space-between",
    marginBottom: "0.25rem",
    marginTop: 0,
    paddingBottom: "0.75rem",
    paddingLeft: theme.spacing(0.5),
    paddingRight: theme.spacing(0.5),
    paddingTop: "0.75rem",
}))

// Scroll container for the networks tree, filling the space below the heading
const NetworksScroller = styled("div")({
    flex: 1,
    minHeight: 0,
    overflowX: "hidden",
    overflowY: "auto",
})

// For showing server status which can be lengthy
const ServerStatusTooltip = styled(({className, ...props}: TooltipProps) => (
    <Tooltip
        describeChild
        {...props}
        classes={{popper: className}}
    />
))(({theme}) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: (theme.vars ?? theme).palette.background.paper,
        color: (theme.vars ?? theme).palette.text.primary,
        maxWidth: 500,
        opacity: 1,
    },
}))
//#endregion: Styled Components

//#region: Types

export interface SidebarProps {
    readonly id: string
    readonly isAwaitingLlm: boolean
    readonly networkIconSuggestions?: NetworkIconSuggestions
    readonly networks: readonly AgentInfo[]
    readonly neuroSanServerURL: string
    readonly newlyAddedTemporaryNetworks?: Set<string>
    readonly onDeleteNetwork?: (network: string, isExpired: boolean) => void
    readonly onEditNetwork?: (network: string) => void
    readonly setSelectedNetwork: (network: string) => void
    readonly temporaryNetworks?: readonly TemporaryNetwork[]
}

//#endregion: Types

export const Sidebar: FC<SidebarProps> = ({
    id,
    isAwaitingLlm,
    networkIconSuggestions,
    networks,
    neuroSanServerURL,
    newlyAddedTemporaryNetworks,
    onDeleteNetwork,
    onEditNetwork,
    setSelectedNetwork,
    temporaryNetworks = EMPTY_ARRAY,
}) => {
    const [expandedItems, setExpandedItems] = useState<string[]>([])

    const [selectedItem, setSelectedItem] = useState<string | null>(null)

    // Display option for agent/network names
    const useNativeNames = useSettingsStore((state) => state.settings.appearance.useNativeNames)

    const [neuroSanServerStatus, setNeuroSanServerStatus] = useState<TestConnectionResult | null>(null)

    useEffect(() => {
        // Track whether the current request is still valid. If the component unmounts or the URL changes,
        // we want to ignore any results from previous requests.
        let isCurrentRequest = true

        const checkStatus = async () => {
            const result = await testConnection(neuroSanServerURL)

            if (!isCurrentRequest) {
                return
            }

            setNeuroSanServerStatus(result)
        }

        void checkStatus()

        const intervalId = setInterval(checkStatus, NEURO_SAN_PING_INTERVAL_MS)

        return () => {
            isCurrentRequest = false
            clearInterval(intervalId)
        }
    }, [neuroSanServerURL])

    // When the edit pencil is clicked, select the network first (if not already selected) so the network loads
    // before entering edit mode — the user shouldn't have to click the network and then click the pencil separately.
    const handleEditNetworkWithSelect = (network: string) => {
        if (selectedItem !== network) {
            setSelectedItem(network)
            setSelectedNetwork(network)
        }
        onEditNetwork?.(network)
    }

    const treeViewItems = buildTreeViewItems(useNativeNames, networks, temporaryNetworks, networkIconSuggestions)

    const handleSelectedItemsChange = (_event: unknown, itemId: string | null) => {
        if (!itemId) {
            return
        }

        const treeItem = findTreeItemById(treeViewItems, itemId)
        if (!treeItem) {
            return
        }

        // Only allow selecting child nodes (i.e., actual networks), not parent nodes (folders).
        if (!treeItem.isNetwork) {
            return
        }

        // Don't allow selecting expired temporary networks
        const expirationTime = treeItem?.temporaryNetworkExpirationTime
        if (expirationTime && expirationTime < new Date()) {
            return
        }

        setSelectedItem(itemId)
        setSelectedNetwork(itemId)
    }

    useEffect(() => {
        let highlightTimeout: ReturnType<typeof setTimeout>
        let removeHighlightTimeout: ReturnType<typeof setTimeout>

        // If we got a new temporary network, expand the temporary category in the tree view
        if (newlyAddedTemporaryNetworks?.size > 0) {
            const firstItem = newlyAddedTemporaryNetworks.values().next().value
            setExpandedItems((prev) =>
                prev.includes(TEMPORARY_NETWORK_FOLDER) ? prev : [...prev, TEMPORARY_NETWORK_FOLDER]
            )
            highlightTimeout = setTimeout(() => {
                /* Scroll the selected node into view and add an animation to draw the user's attention to it.
                Hacky: use a DOM query to find the node. I tried the various ways to do this programmatically
                in MUI RichTreeView including the imperative API (https://mui.com/x/react-tree-view/rich-tree-view/selection/#imperative-api)
                but couldn't get it to work so resorting to this for now.
                */
                const temporaryNetworkNode = document.querySelector(`[data-itemid="${CSS.escape(firstItem)}"]`)
                if (temporaryNetworkNode) {
                    temporaryNetworkNode.scrollIntoView({behavior: "smooth", block: "nearest", inline: "nearest"})
                    temporaryNetworkNode.classList.add(SPARKLE_HIGHLIGHT_CLASS)
                    removeHighlightTimeout = setTimeout(() => {
                        temporaryNetworkNode.classList.remove(SPARKLE_HIGHLIGHT_CLASS)
                    }, 5000)
                }
            }, 50)
        }

        return () => {
            clearTimeout(highlightTimeout)
            clearTimeout(removeHighlightTimeout)
        }
    }, [newlyAddedTemporaryNetworks])

    const toStatusColor = () => {
        switch (neuroSanServerStatus?.success) {
            case true:
                return "green"
            case false:
                return "red"
            case undefined:
            default:
                return "unknown"
        }
    }

    const mapStatus = (statusText: string | undefined) => (statusText === "ok" ? "online" : (statusText ?? "unknown"))

    const getStatusLight = () => (
        <ServerStatusTooltip
            slotProps={{
                popper: {
                    "aria-label": "Neuro-san server status",
                },
            }}
            title={
                <Box sx={{display: "flex", flexDirection: "column", gap: 0.5}}>
                    <Typography variant="body2">
                        <strong>Status:</strong> {mapStatus(neuroSanServerStatus?.statusText)}
                    </Typography>
                    <Typography variant="body2">
                        <strong>URL:</strong> {neuroSanServerURL || "unknown"}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Service:</strong> {neuroSanServerStatus?.healthCheckResponse?.service || "unknown"}
                    </Typography>
                    <Typography
                        sx={{fontWeight: "bold"}}
                        variant="body2"
                    >
                        Versions:
                    </Typography>
                    <Box sx={{ml: 1}}>
                        <Typography variant="body2">
                            <strong>Neuro SAN:</strong>{" "}
                            {neuroSanServerStatus?.healthCheckResponse?.versions?.["neuro-san"] ?? "unknown"}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Neuro SAN Studio:</strong>{" "}
                            {neuroSanServerStatus?.healthCheckResponse?.versions?.["neuro-san-studio"] ?? "unknown"}
                        </Typography>
                    </Box>
                    {!neuroSanServerStatus?.success && neuroSanServerStatus?.httpStatus && (
                        <>
                            {
                                <Typography variant="body2">
                                    <strong>HTTP status:</strong>{" "}
                                    {/* eslint-disable-next-line max-len -- feels unnatural to break it */}
                                    {`${neuroSanServerStatus.httpStatus} (${httpStatus[neuroSanServerStatus.httpStatus] ?? "Unknown status"})`}
                                </Typography>
                            }
                        </>
                    )}
                </Box>
            }
            placement="right"
        >
            {/*For forwarding tooltip events*/}
            <span>
                <StatusLight
                    id={`${id}-agent-network-status-light`}
                    statusValue={toStatusColor()}
                />
            </span>
        </ServerStatusTooltip>
    )

    const getAddNetworkButton = () => (
        <Box sx={{display: "flex"}}>
            <Button
                aria-label="Add New Network"
                disabled={isAwaitingLlm}
                id="add-network-btn"
                onClick={() => {
                    setSelectedItem(AGENT_NETWORK_DESIGNER_ID)
                    setSelectedNetwork(AGENT_NETWORK_DESIGNER_ID)
                }}
                sx={{display: "inline-block", minWidth: "40px"}}
            >
                <Tooltip
                    title="Create your own agent network"
                    placement="top"
                >
                    <AddBoxRounded
                        id="add-network-icon"
                        sx={(theme) => ({
                            color: isAwaitingLlm
                                ? (theme.vars ?? theme).palette.action.disabled
                                : (theme.vars ?? theme).palette.primary.main,
                        })}
                    />
                </Tooltip>
            </Button>
        </Box>
    )

    const getSidebarHeading = () => (
        <SidebarHeading id={`${id}-heading`}>
            <Box sx={{display: "flex", alignItems: "center", gap: (theme) => theme.spacing(1.5)}}>
                {getStatusLight()}
                Agent Networks
            </Box>
            {getAddNetworkButton()}
        </SidebarHeading>
    )

    const getSidebarNetworksTree = () => (
        <RichTreeView
            disableSelection={isAwaitingLlm}
            expandedItems={expandedItems}
            items={treeViewItems}
            multiSelect={false}
            onExpandedItemsChange={(_event, itemIds) => setExpandedItems(itemIds)}
            onSelectedItemsChange={handleSelectedItemsChange}
            selectedItems={selectedItem}
            slotProps={{
                item: {onDeleteNetwork, onEditNetwork: handleEditNetworkWithSelect} as AgentNetworkNodeProps,
            }}
            slots={{item: AgentNetworkTreeItem as RichTreeViewSlots["item"]}}
        />
    )

    return (
        <SidebarAside id={`${id}-sidebar`}>
            {getSidebarHeading()}
            {/* Shared layout group: the selection highlight glides between network items on select */}
            <NetworksScroller>
                <LayoutGroup id={`${id}-networks`}>{getSidebarNetworksTree()}</LayoutGroup>
            </NetworksScroller>
        </SidebarAside>
    )
}

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
import {FC, useEffect, useState} from "react"

import {AgentNetworkNodeProps, AgentNetworkTreeItem} from "./AgentNetworkTreeItem"
import {buildTreeViewItems, findTreeItemById} from "./TreeBuilder"
import {testConnection} from "../../../controller/agent/Agent"
import {NetworkIconSuggestions} from "../../../controller/Types/NetworkIconSuggestions"
import {AgentInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {useSettingsStore} from "../../../state/Settings"
import {TemporaryNetwork} from "../../../state/TemporaryNetworks"
import {getZIndex} from "../../../utils/zIndexLayers"
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
const SidebarAside = styled("aside")({
    borderRightStyle: "solid",
    borderRightWidth: "1px",
    height: "100%",
    overflowY: "auto",
    paddingRight: "0.75rem",

    [`& .${SPARKLE_HIGHLIGHT_CLASS}`]: {
        background: "linear-gradient(90deg, gold, orange, cyan, magenta, gold)",
        backgroundSize: "400% 100%",
        animation: `${sparkle} 5s ease`,
        backgroundClip: "padding-box",
        borderRadius: "4px",
        opacity: 1,
    },
})

// Styled component for the sidebar heading, which is sticky at the top of the sidebar.
const SidebarHeading = styled("h2")(({theme}) => ({
    alignItems: "center",
    backgroundColor: theme.palette.background.default,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    display: "flex",
    fontSize: "1.125rem",
    fontWeight: "bold",
    justifyContent: "space-between",
    marginBottom: "0.25rem",
    paddingBottom: "0.75rem",
    position: "sticky",
    top: 0,
    zIndex: getZIndex(1, theme),
}))

// For showing server status which can be lengthy
const ServerStatusTooltip = styled(({className, ...props}: TooltipProps) => (
    <Tooltip
        describeChild
        {...props}
        classes={{popper: className}}
    />
))({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: "rgba(97, 97, 97, 1)",
        maxWidth: 500,
        opacity: 1,
    },
})
//#endregion: Styled Components

//#region: Types

type CONNECTION_STATUS = "online" | "offline" | "unknown"
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

    const [neuroSanServerStatus, setNeuroSanServerStatus] = useState<{
        error?: string
        httpStatus?: number
        onlineStatus: CONNECTION_STATUS
        version: string | null
    }>({onlineStatus: "unknown", version: null})

    useEffect(() => {
        let isMounted = true

        const checkStatus = async () => {
            try {
                const result = await testConnection(neuroSanServerURL)

                if (!isMounted) {
                    return
                }
                setNeuroSanServerStatus(
                    result.success
                        ? {onlineStatus: "online", version: result.version}
                        : {error: result.status, httpStatus: result.httpStatus, onlineStatus: "offline", version: null}
                )
            } catch (error) {
                console.debug("Error testing connection to Neuro-san server:", error)
                if (isMounted) {
                    const errorString = error instanceof Error ? error.message : String(error)
                    setNeuroSanServerStatus({error: errorString, onlineStatus: "offline", version: null})
                }
            }
        }

        void checkStatus()

        const intervalId = setInterval(checkStatus, NEURO_SAN_PING_INTERVAL_MS)

        return () => {
            isMounted = false
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
        switch (neuroSanServerStatus.onlineStatus) {
            case "online":
                return "green"
            case "offline":
                return "red"
            case "unknown":
            default:
                return "unknown"
        }
    }

    return (
        <SidebarAside id={`${id}-sidebar`}>
            <SidebarHeading id={`${id}-heading`}>
                <Box sx={{display: "flex", alignItems: "center", gap: (theme) => theme.spacing(1.5)}}>
                    <ServerStatusTooltip
                        title={
                            <Box sx={{display: "flex", flexDirection: "column", gap: 0.5}}>
                                <Typography variant="body2">
                                    <strong>Status:</strong> {neuroSanServerStatus.onlineStatus}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Version:</strong> {neuroSanServerStatus.version ?? "unknown"}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>URL:</strong> {neuroSanServerURL || "unknown"}
                                </Typography>
                                {neuroSanServerStatus.error && (
                                    <>
                                        <Typography variant="body2">
                                            <strong>Error:</strong> {neuroSanServerStatus.error}
                                        </Typography>
                                        {neuroSanServerStatus.httpStatus && (
                                            <Typography variant="body2">
                                                <strong>HTTP status:</strong>{" "}
                                                {/* eslint-disable-next-line max-len -- feels unnatural to break it */}
                                                {`${neuroSanServerStatus.httpStatus} (${httpStatus[neuroSanServerStatus.httpStatus] ?? "Unknown status"})`}
                                            </Typography>
                                        )}
                                    </>
                                )}
                            </Box>
                        }
                        placement="right"
                    >
                        {/*For forwarding tooltip events*/}
                        <span>
                            <StatusLight statusValue={toStatusColor()} />
                        </span>
                    </ServerStatusTooltip>
                    Agent Networks
                </Box>
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
                                sx={{color: isAwaitingLlm ? "rgba(0, 0, 0, 0.12)" : "var(--bs-secondary)"}}
                            />
                        </Tooltip>
                    </Button>
                </Box>
            </SidebarHeading>
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
        </SidebarAside>
    )
}

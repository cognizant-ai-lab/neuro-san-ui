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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import ClearIcon from "@mui/icons-material/Clear"
import HighlightOff from "@mui/icons-material/HighlightOff"
import SettingsIcon from "@mui/icons-material/Settings"
import {Chip, styled, useColorScheme, useTheme} from "@mui/material"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import Popover from "@mui/material/Popover"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {RichTreeViewSlots, TreeViewBaseItem, useTreeItem} from "@mui/x-tree-view"
import {RichTreeView} from "@mui/x-tree-view/RichTreeView"
import {
    TreeItemContent,
    TreeItemGroupTransition,
    TreeItemLabel,
    TreeItemProps,
    TreeItemRoot,
} from "@mui/x-tree-view/TreeItem"
import {TreeItemProvider} from "@mui/x-tree-view/TreeItemProvider"
import {
    FC,
    ChangeEvent as ReactChangeEvent,
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    useEffect,
    useState,
} from "react"

import {testConnection, TestConnectionResult} from "../../controller/agent/Agent"
import {AgentInfo} from "../../generated/neuro-san/NeuroSanClient"
import {useEnvironmentStore} from "../../state/environment"
import {isDarkMode} from "../../utils/Theme"
import {getZIndex} from "../../utils/zIndexLayers"
import {cleanUpAgentName} from "../AgentChat/Utils"

// Palette of colors we can use for tags
const TAG_COLORS = [
    "--bs-accent2-light",
    "--bs-accent1-medium",
    "--bs-accent3-medium",
    "--bs-accent3-dark",
    "--bs-green",
    "--bs-orange",
    "--bs-pink",
    "--bs-secondary",
    "--bs-yellow",
] as const

// #region: Styled Components

const PrimaryButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== "darkMode",
})<{darkMode?: boolean}>(({darkMode}) => ({
    backgroundColor: "var(--bs-primary)",
    marginLeft: "0.5rem",
    marginTop: "2px",
    "&:hover": {
        backgroundColor: "var(--bs-primary)",
    },
    "&.Mui-disabled": {
        color: darkMode ? "rgba(255, 255, 255, 0.25)" : undefined,
        backgroundColor: undefined,
    },
}))

// #endregion: Styled Components

// #region: Types

enum CONNECTION_STATUS {
    IDLE = "idle",
    SUCCESS = "success",
    ERROR = "error",
}

export interface SidebarProps {
    readonly customURLCallback: (url: string) => void
    readonly customURLLocalStorage?: string
    readonly id: string
    readonly isAwaitingLlm: boolean
    readonly networks: readonly AgentInfo[]
    readonly setSelectedNetwork: (network: string) => void
}

// Define a type for the TAG_COLORS array
type TagColor = (typeof TAG_COLORS)[number]

// #endregion: Types

export const Sidebar: FC<SidebarProps> = ({
    customURLCallback,
    customURLLocalStorage,
    id,
    isAwaitingLlm,
    networks,
    setSelectedNetwork,
}) => {
    console.debug("networks:", networks)
    // Get default URL from the environment store.
    const {backendNeuroSanApiUrl} = useEnvironmentStore()
    const [urlInput, setUrlInput] = useState<string>(customURLLocalStorage || backendNeuroSanApiUrl)
    const [connectionStatus, setConnectionStatus] = useState<CONNECTION_STATUS>(CONNECTION_STATUS.IDLE)
    const [testConnectionResult, setTestConnectionResult] = useState<TestConnectionResult | null>(null)
    const connectionStatusSuccess = connectionStatus === CONNECTION_STATUS.SUCCESS
    const connectionStatusError = connectionStatus === CONNECTION_STATUS.ERROR
    const isDefaultUrl = urlInput === backendNeuroSanApiUrl
    const saveEnabled = urlInput && (connectionStatusSuccess || (isDefaultUrl && !connectionStatusError))
    const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLButtonElement | null>(null)
    const settingsPopoverOpen = Boolean(settingsAnchorEl)

    // Theming/Dark mode
    const theme = useTheme()
    const {mode, systemMode} = useColorScheme()
    const darkMode = isDarkMode(mode, systemMode)

    const handleSettingsClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        // On open of Settings popover, reset the connection status to idle
        setConnectionStatus(CONNECTION_STATUS.IDLE)
        setSettingsAnchorEl(event.currentTarget)
    }

    const handleSettingsClose = (cancel: boolean = false) => {
        setSettingsAnchorEl(null)
        // If the user cancels, reset the custom URL input to the local storage value, or the default URL
        if (cancel) {
            setUrlInput(customURLLocalStorage || backendNeuroSanApiUrl)
        }
    }

    const handleURLChange = (event: ReactChangeEvent<HTMLInputElement>) => {
        setUrlInput(event.target.value)
        // Reset connection check since URL input was changed
        setConnectionStatus(CONNECTION_STATUS.IDLE)
    }

    const handleDefaultSettings = () => {
        // Clear input but don't close the popover
        setUrlInput(backendNeuroSanApiUrl)
        // Reset connection check since URL input was cleared
        setConnectionStatus(CONNECTION_STATUS.IDLE)
    }

    const handleSaveSettings = () => {
        let tempUrl = urlInput
        if (tempUrl.endsWith("/")) {
            tempUrl = tempUrl.slice(0, -1)
        }
        if (tempUrl && !tempUrl.startsWith("http://") && !tempUrl.startsWith("https://")) {
            tempUrl = `https://${tempUrl}`
        }
        // Call setSelectedNetwork(null) otherwise it can cause issues when switching agent networks (i.e. for Save)
        setSelectedNetwork(null)
        handleSettingsClose()
        customURLCallback(tempUrl)
    }

    const handleSettingsSaveEnterKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" && saveEnabled) {
            handleSaveSettings()
        }
    }

    const handleTestConnection = async () => {
        const result: TestConnectionResult = await testConnection(urlInput)
        setTestConnectionResult(result)
        if (result.success) {
            setConnectionStatus(CONNECTION_STATUS.SUCCESS)
        } else {
            setConnectionStatus(CONNECTION_STATUS.ERROR)
        }
    }

    const handleClearInput = () => {
        setUrlInput("")
        setConnectionStatus(CONNECTION_STATUS.IDLE)
    }

    // Get Neuro-san version on initial load
    useEffect(() => {
        const fetchVersion = async () => {
            // We aren't really trying to test the connection here, just getting the version.
            const result: TestConnectionResult = await testConnection(urlInput)
            if (result.success) {
                setTestConnectionResult(result)
                setConnectionStatus(CONNECTION_STATUS.SUCCESS)
            }
        }
        void fetchVersion()
    }, [])

    const selectNetworkHandler = (network: string) => {
        setSelectedNetwork(network)
    }

    // Keep track of which tags have which colors so that the same tag always has the same color
    const tagsToColors = new Map<string, TagColor>()

    const buildTreeViewItems = () => {
        const map = new Map<string, TreeViewBaseItem>()
        const result: TreeViewBaseItem[] = []

        networks.forEach(({agent_name}) => {
            const parts = agent_name.split("/")
            let currentLevel = result

            parts.forEach((part, index) => {
                const nodeId = parts.slice(0, index + 1).join("/")
                let node = map.get(nodeId)

                if (!node) {
                    node = {id: nodeId, label: part, children: []}
                    map.set(nodeId, node)

                    if (index === 0) {
                        currentLevel.push(node)
                    } else {
                        const parentId = parts.slice(0, index).join("/")
                        const parentNode = map.get(parentId)
                        if (parentNode) {
                            parentNode.children.push(node)
                            parentNode.children.sort((a, b) => a.label.localeCompare(b.label))
                        }
                    }
                }

                currentLevel = node.children
            })
        })

        result.sort((a, b) => a.label.localeCompare(b.label))
        return result
    }

    const treeViewItems = buildTreeViewItems()

    console.debug("treeViewItems:", treeViewItems)
    /**
     * Custom Tree Item for MUI RichTreeView to display agent networks with tags
     * @param props - TreeItemProps
     * @returns JSX.Element containing the custom tree item
     */
    // For now this component is only used in this module so keep it privately defined here
    // eslint-disable-next-line react/no-multi-comp
    const CustomTreeItem = (props: TreeItemProps) => {
        const {itemId, children, label, disabled} = props

        // We know all labels are strings because we set them that way in the tree view items
        const labelString = label as string

        const {getContextProviderProps, getRootProps, getContentProps, getLabelProps, getGroupTransitionProps} =
            useTreeItem({itemId, children, label, disabled})

        const isParent = Array.isArray(children) && children.length > 0
        const isChild = !isParent

        // This is a bit clunky: find the agent node in the networkFolders prop that matches this label
        // Consider change the structure of networkFolders to make this easier (indexed by label?)
        const agentNode = networks?.flatMap((folder) => folder.children).find((child) => child?.label === labelString)

        // Only child items (the actual networks, not the containing folders) have tags. Retrieve tags from the
        // networkFolders data structure passed in as a prop. This could in theory be a custom property for the
        // RichTreeView item, but that isn't well-supported at this time.
        // Discussion: https://stackoverflow.com/questions/69481071/material-ui-how-to-pass-custom-props-to-a-custom-treeitem
        const tags = isChild ? agentNode?.agent?.tags || [] : []

        // Assign colors to tags as needed and store in tagsToColors map
        for (const tag of tags) {
            if (!tagsToColors.has(tag)) {
                const color = TAG_COLORS[tagsToColors.size % TAG_COLORS.length]
                tagsToColors.set(tag, color)
            }
        }

        // retrieve path for this network
        const path = isChild ? agentNode?.path : null

        return (
            <TreeItemProvider {...getContextProviderProps()}>
                <TreeItemRoot {...getRootProps()}>
                    <TreeItemContent
                        key={labelString}
                        {...getContentProps()}
                        {...(isParent || isAwaitingLlm ? {} : {onClick: () => selectNetworkHandler(path)})}
                    >
                        <TreeItemLabel
                            {...getLabelProps()}
                            sx={{
                                fontWeight: isParent ? "bold" : "normal",
                                color: isParent ? "var(--heading-color)" : null,
                                "&:hover": {
                                    textDecoration: "underline", // Adds underline on hover
                                },
                            }}
                        >
                            {cleanUpAgentName(labelString)}
                        </TreeItemLabel>
                        {isChild && tags?.length > 0 ? (
                            <Tooltip
                                title={tags
                                    .slice()
                                    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                                    .map((tag) => (
                                        <Chip
                                            key={tag}
                                            label={tag}
                                            style={{
                                                margin: "0.25rem",
                                                backgroundColor: `var(${tagsToColors.get(tag) || TAG_COLORS[0]})`,
                                            }}
                                        />
                                    ))}
                            >
                                <span style={{fontSize: "0.5rem", marginLeft: "0.5rem", color: "gray"}}>Tags</span>
                            </Tooltip>
                        ) : null}
                    </TreeItemContent>
                    {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
                </TreeItemRoot>
            </TreeItemProvider>
        )
    }

    // const treeViewItems: TreeViewBaseItem[] = networks
    //     .map((network) => ({
    //         id: network.label || "uncategorized-network",
    //         label: network.label || "Uncategorized",
    //         children: network?.children
    //             ?.map((child, idx) => ({
    //                 id: `${child.label}-child-${idx}`,
    //                 label: child.label,
    //                 path: child.path,
    //                 tags: child.agent?.tags || [], // Pass tags from child.agent
    //             }))
    //             .sort((a, b) => a.label.localeCompare(b.label)),
    //         selected: network.label === selectedNetwork,
    //     }))
    //     .sort((a, b) => a.label.localeCompare(b.label))

    return (
        <>
            <aside
                id={`${id}-sidebar`}
                style={{
                    borderRightColor: "var(--bs-gray-light)",
                    borderRightStyle: "solid",
                    borderRightWidth: "1px",
                    height: "100%",
                    overflowY: "auto",
                    paddingRight: "0.75rem",
                }}
            >
                <h2
                    id={`${id}-heading`}
                    style={{
                        borderBottomColor: "var(--bs-gray-light)",
                        borderBottomStyle: "solid",
                        borderBottomWidth: "1px",
                        fontSize: "1.125rem",
                        fontWeight: "bold",
                        marginBottom: "0.25rem",
                        paddingBottom: "0.75rem",
                        position: "sticky",
                        top: 0,
                        zIndex: getZIndex(1, theme),
                    }}
                >
                    Agent Networks
                    <Button
                        aria-label="Agent Network Settings"
                        disabled={isAwaitingLlm}
                        id="agent-network-settings-btn"
                        onClick={handleSettingsClick}
                        sx={{display: "inline-block", minWidth: "40px"}}
                    >
                        <Tooltip
                            id="agent-network-settings-tooltip"
                            placement="top"
                            title={`${customURLLocalStorage || backendNeuroSanApiUrl}\nversion: ${
                                testConnectionResult?.version || "unknown"
                            }`}
                        >
                            <SettingsIcon
                                id="agent-network-settings-icon"
                                sx={{
                                    color: isAwaitingLlm ? "rgba(0, 0, 0, 0.12)" : "var(--bs-secondary)",
                                }}
                            />
                        </Tooltip>
                    </Button>
                </h2>
                <RichTreeView
                    items={treeViewItems}
                    slots={{
                        item: CustomTreeItem as RichTreeViewSlots["item"],
                    }}
                />
            </aside>
            <Popover
                id="agent-network-settings-popover"
                open={settingsPopoverOpen}
                anchorEl={settingsAnchorEl}
                onClose={() => handleSettingsClose(true)}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                }}
                slotProps={{
                    paper: {
                        sx: {
                            paddingTop: "0.75rem",
                            paddingLeft: "0.5rem",
                            paddingRight: "0.5rem",
                            paddingBottom: "0.2rem",
                        },
                    },
                }}
            >
                <TextField
                    autoComplete="off"
                    label="Agent server address"
                    id="agent-network-settings-url"
                    onChange={handleURLChange}
                    onKeyUp={handleSettingsSaveEnterKey}
                    placeholder="https://my_server_address:port"
                    size="small"
                    sx={{marginBottom: "0.5rem", minWidth: "400px"}}
                    type="url"
                    variant="outlined"
                    value={urlInput}
                    slotProps={{
                        input: {
                            endAdornment:
                                urlInput && urlInput !== backendNeuroSanApiUrl ? (
                                    <InputAdornment
                                        id="clear-input-adornment"
                                        position="end"
                                    >
                                        <IconButton
                                            id="clear-input-icon-button"
                                            edge="end"
                                            onClick={handleClearInput}
                                            size="small"
                                            aria-label="Clear input"
                                        >
                                            <ClearIcon
                                                fontSize="small"
                                                id="clear-input-icon"
                                            />
                                        </IconButton>
                                    </InputAdornment>
                                ) : undefined,
                        },
                    }}
                />
                <PrimaryButton
                    disabled={!urlInput}
                    id="agent-network-settings-test-btn"
                    onClick={handleTestConnection}
                    variant="contained"
                    darkMode={darkMode}
                >
                    Test
                </PrimaryButton>
                <PrimaryButton
                    disabled={!saveEnabled}
                    id="agent-network-settings-save-btn"
                    onClick={handleSaveSettings}
                    variant="contained"
                    darkMode={darkMode}
                >
                    Save
                </PrimaryButton>
                <PrimaryButton
                    id="agent-network-settings-cancel-btn"
                    onClick={() => handleSettingsClose(true)}
                    variant="contained"
                    darkMode={darkMode}
                >
                    Cancel
                </PrimaryButton>
                <Button
                    id="agent-network-settings-default-btn"
                    onClick={handleDefaultSettings}
                    sx={{
                        marginLeft: "0.35rem",
                        marginTop: "2px",
                        color: darkMode ? "var(--bs-dark-mode-link)" : undefined,
                    }}
                    variant="text"
                >
                    Default
                </Button>
                {(connectionStatusSuccess || connectionStatusError) && (
                    <Box
                        id="connection-status-box"
                        display="flex"
                        alignItems="center"
                        sx={{
                            marginLeft: "0.25rem",
                            marginBottom: "0.5rem",
                        }}
                    >
                        {connectionStatusSuccess && (
                            <>
                                <CheckCircleOutlineIcon
                                    id="connection-status-success-icon"
                                    sx={{color: "var(--bs-green)", fontSize: "1.2rem", marginRight: "0.25rem"}}
                                />
                                <Typography
                                    id="connection-status-success-msg"
                                    variant="body2"
                                    color="var(--bs-green)"
                                >
                                    Connected successfully
                                </Typography>
                            </>
                        )}
                        {connectionStatusError && (
                            <>
                                <HighlightOff
                                    id="connection-status-error-icon"
                                    sx={{color: "var(--bs-red)", fontSize: "1.2rem", marginRight: "0.25rem"}}
                                />
                                <Typography
                                    id="connection-status-failed-msg"
                                    variant="body2"
                                    color="var(--bs-red)"
                                >
                                    {`Connection failed: "${testConnectionResult?.status || "unknown error"}"`}
                                </Typography>
                            </>
                        )}
                    </Box>
                )}
            </Popover>
        </>
    )
}

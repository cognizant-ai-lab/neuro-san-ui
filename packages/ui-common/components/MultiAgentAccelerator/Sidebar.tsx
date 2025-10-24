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
import {IconButton, InputAdornment, styled, useColorScheme, useTheme} from "@mui/material"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import Popover from "@mui/material/Popover"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {
    FC,
    ChangeEvent as ReactChangeEvent,
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    useEffect,
    useRef,
    useState,
} from "react"

import {testConnection, TestConnectionResult} from "../../controller/agent/Agent"
import {useEnvironmentStore} from "../../state/environment"
import {isDarkMode} from "../../utils/Theme"
import {getZIndex} from "../../utils/zIndexLayers"
import {cleanUpAgentName} from "../AgentChat/Utils"

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

interface SidebarProps {
    customURLCallback: (url: string) => void
    customURLLocalStorage?: string
    id: string
    isAwaitingLlm: boolean
    networks: string[]
    selectedNetwork: string
    setSelectedNetwork: (network: string) => void
}

// #endregion: Types

export const Sidebar: FC<SidebarProps> = ({
    customURLCallback,
    customURLLocalStorage,
    id,
    isAwaitingLlm,
    networks,
    selectedNetwork,
    setSelectedNetwork,
}) => {
    // Get default URL from the environment store.
    const {backendNeuroSanApiUrl} = useEnvironmentStore()
    const [urlInput, setUrlInput] = useState<string>(customURLLocalStorage || backendNeuroSanApiUrl)
    const [connectionStatus, setConnectionStatus] = useState<CONNECTION_STATUS>(CONNECTION_STATUS.IDLE)
    const [testConnectionResult, setTestConnectionResult] = useState<TestConnectionResult | null>(null)
    const connectionStatusSuccess = connectionStatus === CONNECTION_STATUS.SUCCESS
    const connectionStatusError = connectionStatus === CONNECTION_STATUS.ERROR
    const isDefaultUrl = urlInput === backendNeuroSanApiUrl
    // Enable the Save button if the URL input is not empty and the connection status is successful,
    // OR if the URL input is the default URL and connection status is not error
    const saveEnabled = urlInput && (connectionStatusSuccess || (isDefaultUrl && !connectionStatusError))
    const selectedNetworkRef = useRef<HTMLDivElement | null>(null)
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

    // Make sure selected network in the list is always in view
    useEffect(() => {
        if (selectedNetworkRef.current) {
            selectedNetworkRef.current.scrollIntoView({behavior: "instant", block: "nearest"})
        }
    }, [selectedNetwork])

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
                <List
                    id={`${id}-network-list`}
                    sx={{padding: 0, margin: 0}}
                >
                    {networks?.map((network) => (
                        <ListItemButton
                            id={`${network}-btn`}
                            key={network}
                            onClick={() => selectNetworkHandler(network)}
                            sx={{textAlign: "left"}}
                            selected={selectedNetwork === network}
                            disabled={isAwaitingLlm}
                            ref={selectedNetwork === network ? selectedNetworkRef : null}
                        >
                            <ListItemText
                                id={`${network}-text`}
                                slotProps={{
                                    primary: {
                                        fontSize: "0.75rem",
                                    },
                                }}
                                primary={cleanUpAgentName(network)}
                            />
                        </ListItemButton>
                    ))}
                </List>
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

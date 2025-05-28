import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import SettingsIcon from "@mui/icons-material/Settings"
import SpokeOutlinedIcon from "@mui/icons-material/SpokeOutlined"
import {styled} from "@mui/material"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Popover from "@mui/material/Popover"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {FC, useEffect, useRef, useState} from "react"

import {testConnection} from "../../controller/agent/Agent"
import {ZIndexLayers} from "../../utils/zIndexLayers"
import {cleanUpAgentName} from "../AgentChat/Utils"

// #region: Styled Components

const PrimaryButton = styled(Button)({
    backgroundColor: "var(--bs-primary)",
    marginLeft: "0.5rem",
    marginTop: "2px",
    "&:hover": {
        backgroundColor: "var(--bs-primary)",
    },
})

// #endregion: Styled Components

// #region: Types

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

const Sidebar: FC<SidebarProps> = ({
    customURLCallback,
    customURLLocalStorage,
    id,
    isAwaitingLlm,
    networks,
    selectedNetwork,
    setSelectedNetwork,
}) => {
    const selectedNetworkRef = useRef<HTMLDivElement | null>(null)
    const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLButtonElement | null>(null)
    const isSettingsPopoverOpen = Boolean(settingsAnchorEl)
    const [customURLInput, setCustomURLInput] = useState<string>(customURLLocalStorage || "")
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")

    const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setSettingsAnchorEl(event.currentTarget)
    }

    const handleSettingsClose = () => {
        setSettingsAnchorEl(null)
    }

    const handleURLChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCustomURLInput(event.target.value)
    }

    const handleResetSettings = () => {
        // Clear input but don't close the popover
        setCustomURLInput("")
        customURLCallback("")
    }

    const handleSaveSettings = () => {
        let tempUrl = customURLInput
        if (tempUrl.endsWith("/")) {
            tempUrl = tempUrl.slice(0, -1)
        }
        if (tempUrl && !tempUrl.startsWith("http://") && !tempUrl.startsWith("https://")) {
            tempUrl = `https://${tempUrl}`
        }
        handleSettingsClose()
        customURLCallback(tempUrl)
    }

    const handleSettingsSaveEnterKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter") {
            handleSaveSettings()
        }
    }

    const handleTestConnection = async () => {
        const testConnectionResult = testConnection(customURLInput)
        if (testConnectionResult) {
            setConnectionStatus("success")
        } else {
            setConnectionStatus("error")
        }
    }

    // Make sure selected network in the list is always in view
    useEffect(() => {
        if (selectedNetworkRef.current) {
            selectedNetworkRef.current.scrollIntoView({behavior: "instant", block: "nearest"})
        }
    }, [selectedNetwork])

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
                        backgroundColor: "white",
                        borderBottomColor: "var(--bs-gray-light)",
                        borderBottomStyle: "solid",
                        borderBottomWidth: "1px",
                        fontSize: "1.125rem",
                        fontWeight: "bold",
                        marginBottom: "0.25rem",
                        paddingBottom: "0.75rem",
                        position: "sticky",
                        top: 0,
                        zIndex: ZIndexLayers.LAYER_1,
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
                            title={customURLLocalStorage || null}
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
                            <ListItemIcon id={`${network}-icon`}>
                                <SpokeOutlinedIcon id={`${network}-icon`} />
                            </ListItemIcon>
                            <ListItemText
                                id={`${network}-text`}
                                primaryTypographyProps={{fontSize: "0.75rem"}}
                                primary={cleanUpAgentName(network)}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </aside>
            <Popover
                id="agent-network-settings-popover"
                open={isSettingsPopoverOpen}
                anchorEl={settingsAnchorEl}
                onClose={handleSettingsClose}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                }}
                slotProps={{
                    paper: {
                        sx: {
                            paddingTop: "0.5rem",
                            paddingLeft: "0.5rem",
                            paddingRight: "0.5rem",
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
                    sx={{marginBottom: "0.5rem", minWidth: "300px"}}
                    type="url"
                    variant="outlined"
                    value={customURLInput}
                />
                <PrimaryButton
                    id="agent-network-settings-save-btn"
                    onClick={handleSaveSettings}
                    variant="contained"
                >
                    Save
                </PrimaryButton>
                <PrimaryButton
                    id="agent-network-settings-test-btn"
                    onClick={handleTestConnection}
                    variant="contained"
                >
                    Test
                </PrimaryButton>
                <Button
                    id="agent-network-settings-reset-btn"
                    onClick={handleResetSettings}
                    sx={{
                        marginLeft: "0.35rem",
                        marginTop: "2px",
                    }}
                    variant="text"
                >
                    Reset
                </Button>
                {(connectionStatus === "success" || connectionStatus === "error") && (
                    <Box
                        id="connection-status-box"
                        display="flex"
                        alignItems="center"
                        ml={0.5}
                        mb={1.5}
                    >
                        {connectionStatus === "success" && (
                            <>
                                <CheckCircleOutlineIcon
                                    id="connection-status-success-icon"
                                    sx={{color: "green", fontSize: "1.2rem", mr: 0.5}}
                                />
                                <Typography
                                    id="connection-status-success-msg"
                                    variant="body2"
                                    color="green"
                                >
                                    Connected successfully
                                </Typography>
                            </>
                        )}
                        {connectionStatus === "error" && (
                            <>
                                <Typography
                                    id="connection-status-failed-x"
                                    color="red"
                                    fontWeight="bold"
                                    fontSize="1.25rem"
                                >
                                    X
                                </Typography>
                                <Typography
                                    id="connection-status-failed-msg"
                                    variant="body2"
                                    color="red"
                                >
                                    Connection failed
                                </Typography>
                            </>
                        )}
                    </Box>
                )}
            </Popover>
        </>
    )
}

export default Sidebar

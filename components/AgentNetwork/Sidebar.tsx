import SettingsIcon from "@mui/icons-material/Settings"
import SpokeOutlinedIcon from "@mui/icons-material/SpokeOutlined"
import Button from "@mui/material/Button"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Popover from "@mui/material/Popover"
import TextField from "@mui/material/TextField"
import {FC, useEffect, useRef, useState} from "react"

import {ZIndexLayers} from "../../utils/zIndexLayers"
import {cleanUpAgentName} from "../AgentChat/Utils"

// #region: Types
interface SidebarProps {
    customURL: string
    customURLCallback: (url: string) => void
    id: string
    isAwaitingLlm: boolean
    networks: string[]
    selectedNetwork: string
    setSelectedNetwork: (network: string) => void
}
// #endregion: Types

const Sidebar: FC<SidebarProps> = ({
    customURL,
    customURLCallback,
    id,
    isAwaitingLlm,
    networks,
    selectedNetwork,
    setSelectedNetwork,
}) => {
    const selectedNetworkRef = useRef<HTMLDivElement | null>(null)
    const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLButtonElement | null>(null)
    const isSettingsPopoverOpen = Boolean(settingsAnchorEl)
    const [customURLInput, setCustomURLInput] = useState<string>(customURL || "")

    const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setSettingsAnchorEl(event.currentTarget)
    }

    const handleSettingsClose = () => {
        setSettingsAnchorEl(null)
    }

    const handleURLChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCustomURLInput(event.target.value)
    }

    const saveSettings = () => {
        let tempUrl = customURLInput
        if (tempUrl.endsWith("/")) {
            tempUrl = tempUrl.slice(0, -1)
        }
        if (!tempUrl.startsWith("http://") && !tempUrl.startsWith("https://")) {
            tempUrl = `https://${tempUrl}`
        }
        handleSettingsClose()
        customURLCallback(tempUrl)
    }

    const resetSettings = () => {
        // Clear input but don't close the popover
        setCustomURLInput("")
        customURLCallback("")
    }

    const handleSettingsSaveEnterKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter") {
            saveSettings()
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
                        <SettingsIcon
                            id="agent-network-settings-icon"
                            sx={{
                                color: isAwaitingLlm ? "rgba(0, 0, 0, 0.12)" : "var(--bs-secondary)",
                            }}
                        />
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
                    placeholder="https://my_server_address:port.com"
                    size="small"
                    sx={{marginBottom: "0.5rem", minWidth: "300px"}}
                    type="url"
                    variant="outlined"
                    value={customURLInput}
                />
                <Button
                    id="agent-network-settings-save-btn"
                    onClick={saveSettings}
                    sx={{
                        backgroundColor: "var(--bs-primary)",
                        marginLeft: "0.5rem",
                        marginTop: "2px",
                        "&:hover": {
                            backgroundColor: "var(--bs-primary)",
                        },
                    }}
                    variant="contained"
                >
                    Save
                </Button>
                <Button
                    id="agent-network-settings-reset-btn"
                    onClick={resetSettings}
                    sx={{
                        marginLeft: "0.35rem",
                        marginTop: "2px",
                    }}
                    variant="text"
                >
                    Reset
                </Button>
            </Popover>
        </>
    )
}

export default Sidebar

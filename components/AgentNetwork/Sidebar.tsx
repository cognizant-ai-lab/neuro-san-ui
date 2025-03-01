import SpokeOutlinedIcon from "@mui/icons-material/SpokeOutlined"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import {FC} from "react"

import {AgentType} from "../../generated/metadata"

import {cleanUpAgentName} from "../AgentChat/Utils"

// #region: Types
interface SidebarProps {
    id: string
    selectedNetwork: AgentType
    setSelectedNetwork: (network: AgentType) => void
    isAwaitingLlm: boolean
}
// #endregion: Types

// These aren't real agents, so don't show them to the user
export const BLOCK_AGENT_TYPES = [AgentType.UNRECOGNIZED, AgentType.UNKNOWN_AGENT]

const NETWORKS = Object.values(AgentType)
    .filter((agent) => !BLOCK_AGENT_TYPES.includes(agent))
    .sort((a, b) => a.localeCompare(b))

const Sidebar: FC<SidebarProps> = ({id, selectedNetwork, setSelectedNetwork, isAwaitingLlm}) => {
    const selectNetworkHandler = (network: string) => {
        setSelectedNetwork(network as AgentType)
    }

    return (
        <aside
            id={`${id}-sidebar`}
            style={{
                borderRightColor: "var(--bs-gray-light)",
                borderRightStyle: "solid",
                borderRightWidth: "1px",
                height: "100%",
                maxHeight: "35rem",
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
                    zIndex: 1,
                }}
            >
                Agent Networks
            </h2>
            <List
                id={`${id}-network-list`}
                sx={{padding: 0, margin: 0}}
            >
                {NETWORKS.map((network) => (
                    <ListItemButton
                        className="text-sm bg-blue-700 hover:bg-blue-600 rounded cursor-pointer"
                        id={`${network}-btn`}
                        key={network}
                        onClick={() => selectNetworkHandler(network)}
                        sx={{textAlign: "left"}}
                        selected={selectedNetwork === network}
                        disabled={isAwaitingLlm}
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
    )
}

export default Sidebar

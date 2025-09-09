import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import HandymanIcon from "@mui/icons-material/Handyman"
import PersonIcon from "@mui/icons-material/Person"
import TravelExploreIcon from "@mui/icons-material/TravelExplore"
import {Tooltip, useTheme} from "@mui/material"
import Typography from "@mui/material/Typography"
import {FC} from "react"
import {Handle, NodeProps, Position} from "reactflow"

import {BACKGROUND_COLORS, BACKGROUND_COLORS_DARK_IDX, HEATMAP_COLORS} from "./const"
import {AgentConversation} from "../../utils/agentConversations"
import {getZIndex} from "../../utils/zIndexLayers"

export interface AgentNodeProps {
    readonly agentCounts?: Map<string, number>
    readonly agentName: string
    readonly depth: number
    readonly getConversations: () => AgentConversation[] | null
    readonly isAwaitingLlm?: boolean
    readonly displayAs?: string
}

// Node dimensions
export const NODE_HEIGHT = 100
export const NODE_WIDTH = 100

// Icon sizes
// These are used to set the size of the icons displayed in the agent nodes.
const AGENT_ICON_SIZE = "2.25rem"
const FRONTMAN_ICON_SIZE = "4.5rem"

/**
 * A node representing an agent in the network for use in react-flow.
 * @param props See AgentNodeProps
 */
export const AgentNode: FC<NodeProps<AgentNodeProps>> = (props: NodeProps<AgentNodeProps>) => {
    const theme = useTheme()

    // Unpack the node-specific data
    const data: AgentNodeProps = props.data
    const {agentCounts, agentName, depth, displayAs, getConversations, isAwaitingLlm} = data

    const isFrontman = depth === 0

    const maxAgentCount = agentCounts ? Math.max(...Array.from(agentCounts.values())) : 0

    // Unpack the node-specific id
    const agentId = props.id

    // "Active" agents are those at either end of the current communication from the incoming chat messages.
    // We highlight them with a green background.
    const conversations = getConversations()
    const isActiveAgent = conversations?.some((conversation) => conversation.agents.has(agentId)) ?? false

    let backgroundColor: string
    let color: string
    const isHeatmap = agentCounts?.size > 0 && maxAgentCount > 0

    if (isActiveAgent) {
        backgroundColor = "var(--bs-green)"
        color = "var(--bs-white)"
    } else if (isHeatmap) {
        const agentCount = agentCounts.has(agentId) ? agentCounts.get(agentId) : 0

        // Calculate "heat" as a fraction of the times this agent was invoked compared to the maximum agent count.
        const colorIndex = Math.floor((agentCount / maxAgentCount) * (HEATMAP_COLORS.length - 1))
        backgroundColor = HEATMAP_COLORS[colorIndex]
        const isDarkBackground = colorIndex >= BACKGROUND_COLORS_DARK_IDX
        color = isDarkBackground ? "var(--bs-white)" : "var(--bs-dark)"
    } else {
        const colorIndex = depth % BACKGROUND_COLORS.length
        backgroundColor = BACKGROUND_COLORS[colorIndex]
        const isDarkBackground = colorIndex >= BACKGROUND_COLORS_DARK_IDX
        color = isDarkBackground ? "var(--bs-white)" : "var(--bs-dark)"
    }

    // Animation style for making active agent glow and pulse
    // TODO: more idiomatic MUI/style= way of doing this?
    const glowAnimation = isActiveAgent
        ? `@keyframes glow {
            0% { box-shadow: 0 0 10px 4px ${backgroundColor}; opacity: 0.60; }
            50% { box-shadow: 0 0 30px 12px ${backgroundColor}; opacity: 0.90; }
            100% { box-shadow: 0 0 10px 4px ${backgroundColor}; opacity: 1.0; }
        }`
        : "none"

    const boxShadow = isActiveAgent ? "0 0 30px 12px var(--bs-primary), 0 0 60px 24px var(--bs-primary)" : undefined

    // Hide handles when awaiting LLM response ("zen mode")
    const handleVisibility = isAwaitingLlm ? "none" : "block"

    // Determine which icon to display based on the agent type whether it is Frontman or not
    const getDisplayAsIcon = () => {
        const id = `${agentId}-icon`
        if (isFrontman) {
            return (
                // Use special icon and larger size for Frontman
                <PersonIcon
                    id={id}
                    sx={{fontSize: FRONTMAN_ICON_SIZE}}
                />
            )
        }
        switch (displayAs) {
            case "external_agent":
                return (
                    <TravelExploreIcon
                        id={id}
                        sx={{fontSize: AGENT_ICON_SIZE}}
                    />
                )
            case "coded_tool":
                return (
                    <HandymanIcon
                        id={id}
                        sx={{fontSize: AGENT_ICON_SIZE}}
                    />
                )
            case "llm_agent":
            default:
                return (
                    <AutoAwesomeIcon
                        id={id}
                        sx={{fontSize: AGENT_ICON_SIZE}}
                    />
                )
        }
    }

    return (
        <>
            <div
                id={agentId}
                style={{
                    alignItems: "center",
                    animation: isActiveAgent ? "glow 2.0s infinite" : "none",
                    backgroundColor,
                    borderRadius: "50%",
                    boxShadow,
                    color,
                    display: "flex",
                    height: NODE_HEIGHT * (isFrontman ? 1.25 : 1.0),
                    justifyContent: "center",
                    shapeOutside: "circle(50%)",
                    textAlign: "center",
                    width: NODE_WIDTH * (isFrontman ? 1.25 : 1.0),
                    zIndex: getZIndex(1, theme),
                    position: "relative",
                }}
            >
                <style id={`${agentId}-glow-animation`}>{glowAnimation}</style>
                {getDisplayAsIcon()}
                <Handle
                    id={`${agentId}-left-handle`}
                    position={Position.Left}
                    type="source"
                    style={{display: handleVisibility}}
                />
                <Handle
                    id={`${agentId}-right-handle`}
                    position={Position.Right}
                    type="source"
                    style={{display: handleVisibility}}
                />
                <Handle
                    id={`${agentId}-top-handle`}
                    position={Position.Top}
                    type="source"
                    style={{display: handleVisibility}}
                />
                <Handle
                    id={`${agentId}-bottom-handle`}
                    position={Position.Bottom}
                    type="source"
                    style={{display: handleVisibility}}
                />
            </div>
            <Tooltip
                id={`${agentId}-tooltip`}
                title={agentName}
                placement="top"
                disableInteractive
            >
                <Typography
                    id={`${agentId}-name`}
                    sx={{
                        display: "-webkit-box",
                        fontSize: "18px",
                        fontWeight: "bold",
                        lineHeight: "1.4em",
                        overflow: "hidden",
                        textAlign: "center",
                        textOverflow: "ellipsis",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        width: `${NODE_WIDTH}px`,
                        zIndex: 10,
                    }}
                >
                    {agentName}
                </Typography>
            </Tooltip>
        </>
    )
}

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

// We have to disable the restricted imports rule here because we need to dynamically access MUI icons by name.
// eslint-disable-next-line no-restricted-imports
import * as MuiIcons from "@mui/icons-material"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import HandymanIcon from "@mui/icons-material/Handyman"
import PersonIcon from "@mui/icons-material/Person"
import TravelExploreIcon from "@mui/icons-material/TravelExplore"
import {keyframes, styled, useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {Handle, NodeProps, Position} from "@xyflow/react"
import type {Node as RFNode} from "@xyflow/react"
import {FC} from "react"

import {AgentConversation} from "./AgentConversations"
import {
    DISPLAY_AS_CODED_TOOL,
    DISPLAY_AS_EXTERNAL_AGENT,
    DISPLAY_AS_LANGCHAIN_TOOL,
    DISPLAY_AS_LLM_AGENT,
    isEditableAgent,
} from "./const"
import {useSettingsStore} from "../../state/Settings"
import {usePalette} from "../../Theme/Palettes"
import {isLightColor} from "../../Theme/Theme"
import {getZIndex} from "../../utils/zIndexLayers"

export interface AgentNodeProps extends Record<string, unknown> {
    readonly agentCounts?: Map<string, number>
    readonly agentName: string
    readonly depth: number
    readonly displayAs?: string
    readonly getConversations: () => AgentConversation[] | null
    readonly isAwaitingLlm?: boolean
    readonly agentIconSuggestion?: string
    readonly isTemporaryNetwork?: boolean
}

// Node dimensions
export const NODE_HEIGHT = 100
export const NODE_WIDTH = 100

// Icon sizes
// These are used to set the size of the icons displayed in the agent nodes.
const AGENT_ICON_SIZE = "2.25rem"
const FRONTMAN_ICON_SIZE = "4.5rem"

// Pulsing glow animation for when an agent is active.
const glowKeyFrames = (color: string) => keyframes`
    0% {
        box-shadow: 0 0 10px 4px ${color};
        opacity: 0.6;
    }
    50% {
        box-shadow: 0 0 30px 12px ${color};
        opacity: 0.9;
    }
    100% {
        box-shadow: 0 0 10px 4px ${color};
        opacity: 1.0;
    }
`

// Styled component for the agent nodes, applies glow animation if active
const AnimatedNode = styled("div", {
    shouldForwardProp: (prop) => prop !== "glowColor" && prop !== "isActive",
})<{glowColor: string; isActive: boolean}>(({glowColor, isActive}) => ({
    alignItems: "center",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    position: "relative",
    shapeOutside: "circle(50%)",
    textAlign: "center",
    ...(isActive && {
        animation: `${glowKeyFrames(glowColor)} 2s infinite`,
    }),
}))

/**
 * A node representing an agent in the network for use in react-flow.
 * @param props See AgentNodeProps
 */
export const AgentNode: FC<NodeProps<RFNode<AgentNodeProps>>> = (props: NodeProps<RFNode<AgentNodeProps>>) => {
    const theme = useTheme()

    // Agent node color from settings store
    const agentNodeColor = useSettingsStore((state) => state.settings.appearance.agentNodeColor)

    // Agent node icon color from settings store
    const agentNodeIconColor = useSettingsStore((state) => state.settings.appearance.agentIconColor)
    const autoAgentIconColor = useSettingsStore((state) => state.settings.appearance.autoAgentIconColor)

    // Color palette for depth/heatmap coloring
    const palette = usePalette()

    // Unpack the node-specific data
    const data: AgentNodeProps = props.data
    const {
        agentCounts,
        agentName,
        depth,
        displayAs,
        getConversations,
        agentIconSuggestion,
        isAwaitingLlm,
        isTemporaryNetwork,
    } = data

    // Determine if this is the Frontman node (depth 0)
    const isFrontman = depth === 0

    // Determine max agent count for heatmap scaling
    const maxAgentCount = agentCounts ? Math.max(...Array.from(agentCounts.values())) : 0

    // Unpack the node-specific id
    const agentId = props.id

    // "Active" agents are those at either end of the current communication from the incoming chat messages.
    // We highlight them with a different color
    const conversations = getConversations()
    const isActiveAgent = conversations?.some((conversation) => conversation.agents.has(agentId)) ?? false

    // Determine background color based on active status, heatmap, or depth
    let backgroundColor: string

    // HACK: parent passes in agentCounts as undefined when not using heatmap mode. We distinguish between
    // "undefined" (no heatmap) and "defined but empty" (heatmap with zero counts).
    const isHeatmap = agentCounts !== undefined
    if (isActiveAgent) {
        // Highlight active agents with a distinct color
        backgroundColor = agentNodeColor
    } else if (isHeatmap) {
        // Color by "heatmap" of agent invocation counts
        const agentCount = agentCounts.has(agentId) ? agentCounts.get(agentId) : 0

        // Calculate "heat" as a fraction of the times this agent was invoked compared to the maximum agent count.
        const colorIndex = Math.floor((agentCount / maxAgentCount) * (palette.length - 1))
        backgroundColor = palette[colorIndex]
    } else {
        // Color by depth in the agent graph
        const colorIndex = depth % palette.length
        backgroundColor = palette[colorIndex]
    }

    // Hide handles when awaiting LLM response ("zen mode").
    const handleVisibility = isAwaitingLlm ? "hidden" : "visible"

    // Determine which icon to display based on the agent type whether it is Frontman or not
    const getDisplayAsIcon = () => {
        const id = `${agentId}-icon`
        if (agentIconSuggestion && MuiIcons[agentIconSuggestion as keyof typeof MuiIcons]) {
            const IconComponent = MuiIcons[agentIconSuggestion as keyof typeof MuiIcons]
            return <IconComponent sx={{fontSize: AGENT_ICON_SIZE}} />
        } else {
            if (agentIconSuggestion) {
                console.warn(`Invalid MUI icon suggestion: ${agentIconSuggestion}`)
            }
            if (isFrontman) {
                return (
                    // Use special icon and larger size for Frontman
                    <PersonIcon
                        id={id}
                        sx={{fontSize: FRONTMAN_ICON_SIZE}}
                    />
                )
            } else {
                switch (displayAs) {
                    case DISPLAY_AS_EXTERNAL_AGENT:
                        return (
                            <TravelExploreIcon
                                id={id}
                                sx={{fontSize: AGENT_ICON_SIZE}}
                            />
                        )
                    // This should be a supported type but we're not seeing it?
                    case DISPLAY_AS_LANGCHAIN_TOOL:
                    case DISPLAY_AS_CODED_TOOL:
                        return (
                            <HandymanIcon
                                id={id}
                                sx={{fontSize: AGENT_ICON_SIZE}}
                            />
                        )
                    case DISPLAY_AS_LLM_AGENT:
                    default:
                        return (
                            <AutoAwesomeIcon
                                id={id}
                                sx={{fontSize: AGENT_ICON_SIZE}}
                            />
                        )
                }
            }
        }
    }

    // Determine icon color based on settings. If auto color is enabled, use contrasting color for readability.
    const color = autoAgentIconColor ? theme.palette.getContrastText(backgroundColor) : agentNodeIconColor

    // Choose a glow color that contrasts with the background for visibility.
    const glowColor = isLightColor(theme.palette.background.default)
        ? theme.palette.common.black
        : theme.palette.common.white

    return (
        <>
            <AnimatedNode
                id={agentId}
                data-testid={agentId}
                glowColor={glowColor}
                isActive={isActiveAgent}
                sx={{
                    backgroundColor,
                    color,
                    cursor: isTemporaryNetwork && isEditableAgent(displayAs) ? "pointer" : "grab",
                    height: NODE_HEIGHT * (isFrontman ? 1.25 : 1.0),
                    width: NODE_WIDTH * (isFrontman ? 1.25 : 1.0),
                    zIndex: getZIndex(1, theme),
                }}
            >
                {getDisplayAsIcon()}
                <Handle
                    id={`${agentId}-left-handle`}
                    position={Position.Left}
                    type="source"
                    style={{visibility: handleVisibility}}
                />
                <Handle
                    id={`${agentId}-right-handle`}
                    position={Position.Right}
                    type="source"
                    style={{visibility: handleVisibility}}
                />
                <Handle
                    id={`${agentId}-top-handle`}
                    position={Position.Top}
                    type="source"
                    style={{visibility: handleVisibility}}
                />
                <Handle
                    id={`${agentId}-bottom-handle`}
                    position={Position.Bottom}
                    type="source"
                    style={{visibility: handleVisibility}}
                />
            </AnimatedNode>
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

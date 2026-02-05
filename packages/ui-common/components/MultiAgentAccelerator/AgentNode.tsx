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
import Box from "@mui/material/Box"
import {useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {FC} from "react"
import {Handle, NodeProps, Position} from "reactflow"

import {useSettingsStore} from "../../state/Settings"
import {PALETTES} from "../../Theme/Palettes"
import {AgentConversation} from "../../utils/agentConversations"
import {getZIndex} from "../../utils/zIndexLayers"

export interface AgentNodeProps {
    readonly agentCounts?: Map<string, number>
    readonly agentName: string
    readonly depth: number
    readonly displayAs?: string
    readonly getConversations: () => AgentConversation[] | null
    readonly isAwaitingLlm?: boolean
    readonly agentIconSuggestion?: string
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

    // Agent node color from settings store
    const agentNodeColor = useSettingsStore((state) => state.settings.appearance.agentNodeColor)

    // Agent node icon color from settings store
    const agentNodeIconColor = useSettingsStore((state) => state.settings.appearance.agentIconColor)
    const autoAgentIconColor = useSettingsStore((state) => state.settings.appearance.autoAgentIconColor)

    // Color palette for depth/heatmap coloring
    const brandPalette = useSettingsStore((state) => state.settings.branding.rangePalette)
    const paletteKey = useSettingsStore((state) => state.settings.appearance.rangePalette)
    const palette = paletteKey === "brand" ? brandPalette : PALETTES[paletteKey]

    // Unpack the node-specific data
    const data: AgentNodeProps = props.data
    const {agentCounts, agentName, depth, getConversations, agentIconSuggestion, isAwaitingLlm} = data

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
        if (agentIconSuggestion && MuiIcons[agentIconSuggestion as keyof typeof MuiIcons]) {
            const IconComponent = MuiIcons[agentIconSuggestion as keyof typeof MuiIcons]
            return <IconComponent sx={{fontSize: AGENT_ICON_SIZE}} />
        } else {
            // return blank icon
            return <AutoAwesomeIcon sx={{fontSize: isFrontman ? FRONTMAN_ICON_SIZE : AGENT_ICON_SIZE}} />
        }
    }

    // Determine icon color based on settings. If auto color is enabled, use contrasting color for readability.
    const color = autoAgentIconColor ? theme.palette.getContrastText(backgroundColor) : agentNodeIconColor

    return (
        <Tooltip
            id={`${agentId}-tooltip`}
            title={agentName}
            placement="top"
            disableInteractive={true}
        >
            <Box>
                <Box
                    id={agentId}
                    data-testid={agentId}
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
                </Box>
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
            </Box>
        </Tooltip>
    )
}

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
import EditIcon from "@mui/icons-material/Edit"
import HandymanIcon from "@mui/icons-material/Handyman"
import PersonIcon from "@mui/icons-material/Person"
import TravelExploreIcon from "@mui/icons-material/TravelExplore"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import {keyframes, styled, useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {Handle, NodeProps, Position} from "@xyflow/react"
import type {Node as RFNode} from "@xyflow/react"
import {FC} from "react"

import {usePalette, useSettingsStore} from "../../../state/Settings"
import {
    getSheen,
    glassSurface,
    glowShadow,
    gradientBorder,
    SHEEN_EASE,
    SHEEN_FONT_DISPLAY,
    SHEEN_RADIUS,
    sheenConic,
    sheenGradient,
} from "../../../Theme/sheen"
import {getZIndex} from "../../../utils/zIndexLayers"
import {AgentConversation} from "../AgentConversations"
import {DisplayAs} from "../const"

export interface AgentNodeProps extends Record<string, unknown> {
    readonly agentCounts?: Map<string, number>
    readonly agentName: string
    readonly depth: number
    readonly displayAs?: string
    readonly getConversations: () => AgentConversation[] | null
    readonly isAwaitingLlm?: boolean
    readonly isEditMode?: boolean
    readonly agentIconSuggestion?: string
    readonly isEditable?: boolean
}

// A zero-width space character, used to give the browser a hint where to break long names
const ZERO_WIDTH_SPACE = "\u200B"

// Node dimensions
export const NODE_HEIGHT = 100
export const NODE_WIDTH = 100
export const FRONTMAN_SIZE_MULTIPLIER = 1.25

// Icon sizes
// These are used to set the size of the icons displayed in the agent nodes.
const AGENT_ICON_SIZE = "2.25rem"
const FRONTMAN_ICON_SIZE = "4.5rem"

// Glossy "glass disc" shading layered over the node's fill color: a specular hotspot near the top-left, a soft
// top-to-bottom sheen and a darker rim at the bottom for depth.
const NODE_SPECULAR =
    "radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 42%), " +
    "linear-gradient(170deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 48%, rgba(0, 0, 0, 0.22))"

// Inner bevel + resting drop shadow for the disc
const NODE_DEPTH_SHADOW =
    "inset 0 1px 1px rgba(255, 255, 255, 0.45), inset 0 -6px 14px rgba(0, 0, 0, 0.22), " +
    "0 10px 24px -10px rgba(0, 0, 0, 0.55)"

// Pulsing glow animation for when an agent is active (keeps the disc's bevel while the halo breathes).
const glowKeyFrames = (color: string) => keyframes`
    0% {
        box-shadow: ${NODE_DEPTH_SHADOW}, 0 0 12px 2px ${color};
    }
    50% {
        box-shadow: ${NODE_DEPTH_SHADOW}, 0 0 36px 12px ${color};
    }
    100% {
        box-shadow: ${NODE_DEPTH_SHADOW}, 0 0 12px 2px ${color};
    }
`

// Human-readable agent types for the hover card
const DISPLAY_AS_LABELS: Record<string, string> = {
    [DisplayAs.LLM_AGENT]: "LLM agent",
    [DisplayAs.CODED_TOOL]: "Coded tool",
    [DisplayAs.LANGCHAIN_TOOL]: "LangChain tool",
    [DisplayAs.EXTERNAL_AGENT]: "External agent",
}

// Width of the rotating iridescent ring around active nodes, and its gap from the disc (px)
const ACTIVE_RING_WIDTH = 3
const ACTIVE_RING_OFFSET = 5

// Styled component for the agent nodes: glossy glass disc; active agents get a rotating conic ring + glow pulse
const AnimatedNode = styled("div", {
    shouldForwardProp: (prop) => prop !== "glowColor" && prop !== "isActive",
})<{glowColor: string; isActive: boolean}>(({glowColor, isActive, theme}) => ({
    alignItems: "center",
    backgroundImage: NODE_SPECULAR,
    borderRadius: "50%",
    boxShadow: NODE_DEPTH_SHADOW,
    display: "flex",
    justifyContent: "center",
    position: "relative",
    shapeOutside: "circle(50%)",
    textAlign: "center",
    transition: `transform 0.25s ${SHEEN_EASE}`,
    "&:hover": {transform: "scale(1.04)"},
    ...(isActive && {
        animation: `${glowKeyFrames(glowColor)} 2s infinite`,
        // Rotating iridescent ring (circular take on spinningBorder). Decorative only: no pointer events, so the
        // node's hit area and handles are unaffected.
        "&::before": {
            content: '""',
            position: "absolute",
            inset: `-${ACTIVE_RING_OFFSET + ACTIVE_RING_WIDTH}px`,
            padding: `${ACTIVE_RING_WIDTH}px`,
            borderRadius: "50%",
            background: sheenConic(theme),
            animation: "sheenSpin 3s linear infinite",
            pointerEvents: "none",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        },
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
    const {agentCounts, agentName, depth, displayAs, getConversations, agentIconSuggestion, isAwaitingLlm, isEditable} =
        data

    // Determine if this is the Frontman node (depth 0)
    const isFrontman = depth === 0

    // Determine max agent count for heatmap scaling
    const maxAgentCount = agentCounts ? Math.max(...agentCounts.values()) : 0

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

        // Check for valid MUI icon suggestion from the LLM suggestion service
        const SuggestedIcon = agentIconSuggestion ? MuiIcons[agentIconSuggestion as keyof typeof MuiIcons] : undefined

        // If the LLM provided a valid icon suggestion, use it. Otherwise, fall back to default icons based on
        // agent type.
        if (SuggestedIcon) {
            return (
                <SuggestedIcon
                    id={id}
                    sx={{fontSize: AGENT_ICON_SIZE}}
                />
            )
        }

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
            case DisplayAs.EXTERNAL_AGENT:
                return (
                    <TravelExploreIcon
                        id={id}
                        sx={{fontSize: AGENT_ICON_SIZE}}
                    />
                )
            // This should be a supported type but we're not seeing it?
            case DisplayAs.LANGCHAIN_TOOL:
            case DisplayAs.CODED_TOOL:
                return (
                    <HandymanIcon
                        id={id}
                        sx={{fontSize: AGENT_ICON_SIZE}}
                    />
                )
            case DisplayAs.LLM_AGENT:
            default:
                return (
                    <AutoAwesomeIcon
                        id={id}
                        sx={{fontSize: AGENT_ICON_SIZE}}
                    />
                )
        }
    }

    // Determine icon color based on settings. If auto color is enabled, use contrasting color for readability.
    const color = autoAgentIconColor ? theme.palette.getContrastText(backgroundColor) : agentNodeIconColor

    // Active agents pulse with the sheen accent glow (follows the active color scheme)
    const glowColor = getSheen(theme).glow

    // Insert zero-width spaces into the agent name to give the browser hints where to wrap.
    const wrappedAgentName = agentName
        // Allow wrap after underscore
        .replaceAll("_", `_${ZERO_WIDTH_SPACE}`)
        // Allow wrap before capitals in camel/PascalCase (e.g., CustomerSupport -> Customer|Support)
        .replaceAll(/(?<lower>[\da-z])(?<upper>[A-Z])/gu, `$<lower>${ZERO_WIDTH_SPACE}$<upper>`)
        // Also split abbreviation->word boundary (e.g., HTTPServer -> HTTP|Server), but not H|T|T|P
        .replaceAll(/(?<abbr>[A-Z])(?<word>[A-Z][a-z])/gu, `$<abbr>${ZERO_WIDTH_SPACE}$<word>`)

    const height = NODE_HEIGHT * (isFrontman ? FRONTMAN_SIZE_MULTIPLIER : 1.0)
    const width = height

    const getEditButton = () => (
        <Tooltip
            title="Edit"
            placement="top"
            disableInteractive
        >
            <IconButton
                className="agent-node-edit-icon"
                // Decorative icons only. The agent node is the click/Enter target.
                aria-hidden={true}
                tabIndex={-1}
                sx={{
                    ...glassSurface(theme, 999),
                    position: "absolute",
                    top: 0,
                    right: 0,
                    padding: "3px",
                    zIndex: 2,
                    cursor: "pointer",
                    "&:hover": {boxShadow: glowShadow(theme, 12)},
                }}
            >
                <EditIcon
                    id={`${agentId}-edit-icon`}
                    sx={{fontSize: "1rem", color: "text.primary"}}
                />
            </IconButton>
        </Tooltip>
    )

    const getNodeName = () => (
        <Tooltip
            id={`${agentId}-tooltip`}
            title={agentName}
            placement="top"
            disableInteractive
        >
            <Typography
                id={`${agentId}-name`}
                sx={{
                    ...glassSurface(theme, 8),
                    color: (theme.vars ?? theme).palette.text.primary,
                    display: "-webkit-box",
                    fontSize: "16px",
                    fontWeight: "700",
                    marginTop: "0.5rem",
                    overflow: "hidden",
                    overflowWrap: "anywhere",
                    paddingLeft: 0.75,
                    paddingRight: 0.75,
                    paddingBottom: 0.45,
                    paddingTop: 0.45,
                    textAlign: "center",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 4,
                    width,
                    zIndex: getZIndex(1, theme),
                }}
            >
                {wrappedAgentName}
            </Typography>
        </Tooltip>
    )

    // Rich glass hover card: type, name, depth, invocation count and live status
    const agentTypeLabel = isFrontman ? "Front man" : (DISPLAY_AS_LABELS[displayAs] ?? "Agent")
    const invocationCount = agentCounts?.get(agentId) ?? 0

    const getStat = (label: string, value: string) => (
        <Box sx={{display: "flex", flexDirection: "column"}}>
            <Typography
                component="span"
                sx={{color: "text.secondary", fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase"}}
            >
                {label}
            </Typography>
            <Typography
                component="span"
                sx={{fontSize: "0.85rem", fontVariantNumeric: "tabular-nums", fontWeight: 600}}
            >
                {value}
            </Typography>
        </Box>
    )

    const getHoverCard = () => (
        <Box
            id={`${agentId}-hover-card`}
            sx={{display: "flex", flexDirection: "column", gap: 0.75, minWidth: 180, maxWidth: 260}}
        >
            <Box sx={{alignItems: "center", display: "flex", gap: 0.75}}>
                <Box
                    sx={{
                        backgroundColor,
                        backgroundImage: NODE_SPECULAR,
                        borderRadius: "50%",
                        flexShrink: 0,
                        height: 10,
                        width: 10,
                    }}
                />
                <Typography
                    component="span"
                    sx={{
                        color: "text.secondary",
                        fontSize: "0.65rem",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                    }}
                >
                    {agentTypeLabel}
                </Typography>
                {isActiveAgent && (
                    <Box
                        component="span"
                        sx={{
                            backgroundImage: sheenGradient(theme),
                            borderRadius: 999,
                            color: (theme.vars ?? theme).palette.primary.contrastText,
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            ml: "auto",
                            px: 0.75,
                            py: 0.1,
                            textTransform: "uppercase",
                        }}
                    >
                        Active
                    </Box>
                )}
            </Box>
            <Typography
                component="span"
                sx={{
                    color: "text.primary",
                    fontFamily: SHEEN_FONT_DISPLAY,
                    fontSize: "1.1rem",
                    fontWeight: 500,
                    lineHeight: 1.2,
                    overflowWrap: "anywhere",
                }}
            >
                {agentName}
            </Typography>
            <Box sx={{display: "flex", gap: 2}}>
                {getStat("Depth", String(depth))}
                {isHeatmap && getStat("Calls", String(invocationCount))}
            </Box>
            {isEditable && (
                <Typography
                    component="span"
                    sx={{color: "primary.main", fontSize: "0.7rem", fontWeight: 600}}
                >
                    Click or press Enter to edit
                </Typography>
            )}
        </Box>
    )

    const getAnimatedNode = () => (
        <AnimatedNode
            id={agentId}
            data-testid={agentId}
            glowColor={glowColor}
            isActive={isActiveAgent}
            sx={{
                backgroundColor,
                color,
                cursor: isEditable ? "pointer" : "grab",
                height,
                width,
                zIndex: getZIndex(1, theme),
                // Reveal the edit icon on hover, or when a keyboard user tabs to the node.
                "& .agent-node-edit-icon": {opacity: 0, transition: "opacity 0.15s ease-in-out"},
                "&:hover .agent-node-edit-icon": {opacity: 1},
                ".react-flow__node:focus-visible & .agent-node-edit-icon": {opacity: 1},
            }}
        >
            {getDisplayAsIcon()}

            {isEditable && getEditButton()}

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
    )

    const getNode = () => (
        <Tooltip
            enterDelay={250}
            disableInteractive
            placement="right"
            slotProps={{
                tooltip: {
                    sx: {
                        ...glassSurface(theme, SHEEN_RADIUS),
                        ...gradientBorder(theme, SHEEN_RADIUS, 1, 0.45),
                        border: 0,
                        boxShadow: `inset 0 1px 0 ${getSheen(theme).highlight}, 0 18px 50px -16px rgba(0, 0, 0, 0.6)`,
                        color: "text.primary",
                        maxWidth: "none",
                        padding: "10px 14px",
                    },
                },
            }}
            title={getHoverCard()}
        >
            {getAnimatedNode()}
        </Tooltip>
    )

    return (
        <>
            {getNode()}
            {getNodeName()}
        </>
    )
}

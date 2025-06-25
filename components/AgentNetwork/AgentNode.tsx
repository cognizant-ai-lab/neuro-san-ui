import {Tooltip} from "@mui/material"
import Typography from "@mui/material/Typography"
import {FC} from "react"
import {Handle, NodeProps, Position} from "reactflow"

import {BACKGROUND_COLORS, BACKGROUND_COLORS_DARK_IDX, HEATMAP_COLORS} from "./const"
import {Origin} from "../../generated/neuro-san/OpenAPITypes"

export interface AgentNodeProps {
    readonly agentName: string
    readonly getOriginInfo: () => Origin[]
    readonly isFrontman: boolean
    readonly depth: number
    readonly agentCounts?: Map<string, number>
}

// Node dimensions
export const NODE_HEIGHT = 80
export const NODE_WIDTH = 80

/**
 * A node representing an agent in the network for use in react-flow.
 * @param props See AgentNodeProps
 */
export const AgentNode: FC<NodeProps<AgentNodeProps>> = (props: NodeProps<AgentNodeProps>) => {
    // Unpack the node-specific data
    const data: AgentNodeProps = props.data
    const {agentName, getOriginInfo, isFrontman, depth, agentCounts} = data

    const maxAgentCount = agentCounts ? Math.max(...Array.from(agentCounts.values())) : 0

    // Unpack the node-specific id
    const agentId = props.id

    // "Active" agents are those at either end of the current communication from the incoming chat messages.
    // We highlight them with a red background.
    const isActiveAgent = getOriginInfo()
        .map((originItem) => originItem.tool)
        .includes(agentId)

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

    return (
        <div
            id={agentId}
            style={{
                alignItems: "center",
                animation: isActiveAgent ? "glow 2.0s infinite" : "none",
                backgroundColor,
                borderRadius: "50%",
                boxShadow,
                borderWidth: !isFrontman && isActiveAgent ? 4 : 1,
                color,
                display: "flex",
                height: NODE_HEIGHT,
                justifyContent: "center",
                shapeOutside: "circle(50%)",
                textAlign: "center",
                width: NODE_WIDTH,
            }}
        >
            <style id={`${agentId}-glow-animation`}>{glowAnimation}</style>
            <Tooltip
                id={`${agentId}-tooltip`}
                title={agentName}
                placement="top"
            >
                <Typography
                    id={`${agentId}-name`}
                    sx={{
                        fontSize: "11px",
                        overflowWrap: "break-word",
                        textAlign: "center",
                        width: "90%",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                    }}
                >
                    {agentName}
                </Typography>
            </Tooltip>
            <Handle
                id={`${agentId}-left-handle`}
                position={Position.Left}
                type="source"
            />
            <Handle
                id={`${agentId}-right-handle`}
                position={Position.Right}
                type="source"
            />
        </div>
    )
}

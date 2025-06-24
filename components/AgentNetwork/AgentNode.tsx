import {Tooltip} from "@mui/material"
import Typography from "@mui/material/Typography"
import {FC} from "react"
import {Handle, NodeProps, Position} from "reactflow"

import {BACKGROUND_COLORS, HEATMAP_COLORS} from "./const"
import {Origin} from "../../generated/neuro-san/OpenAPITypes"

export interface AgentNodeProps {
    agentName: string
    getOriginInfo: () => Origin[]
    isFrontman: boolean
    depth: number
    agentCounts: Map<string, number>
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

    const isLinearLayout = depth === undefined

    let backgroundColor: string
    const isHeatmap = agentCounts?.size > 0 && maxAgentCount > 0
    if (isHeatmap) {
        const agentCount = agentCounts.has(agentId) ? agentCounts.get(agentId) : 0

        // Calculate "heat" as a fraction of the times this agent was invoked compared to the maximum agent count.
        const colorIndex = Math.floor((agentCount / maxAgentCount) * (HEATMAP_COLORS.length - 1))
        backgroundColor = HEATMAP_COLORS[colorIndex]
    } else if (isLinearLayout) {
        // For linear layout, we use a single color for all nodes.
        backgroundColor = isActiveAgent ? "var(--bs-red)" : "var(--bs-primary)"
    } else if (isActiveAgent) {
        backgroundColor = "var(--bs-green)"
    } else {
        backgroundColor = BACKGROUND_COLORS[depth % BACKGROUND_COLORS.length]
    }

    // Text color varies based on if it's a layout that has depth or not (radial vs linear).
    let textColor: string
    if (!isLinearLayout && isFrontman) {
        textColor = "var(--bs-primary)"
    } else {
        textColor = "var(--bs-white)"
    }

    // Animation style for making active agent glow and pulse
    // TODO: more idiomatic MUI/style= way of doing this?
    const glowAnimation = isActiveAgent
        ? `@keyframes glow {
                0% { box-shadow: 0 0 5px var(--bs-primary) ; opacity: 0.50; }
                50% { box-shadow: 0 0 20px var(--bs-primary); opacity: 0.75 }
                100% { box-shadow: 0 0 5px var(--bs-primary); opacity: 1.0 }
            }`
        : "none"

    return (
        <div
            id={agentId}
            style={{
                alignItems: "center",
                backgroundColor,
                borderRadius: "50%",
                borderColor: "var(--bs-primary)",
                borderWidth: !isFrontman && isActiveAgent ? 4 : 1,
                color: textColor,
                display: "flex",
                height: NODE_HEIGHT,
                justifyContent: "center",
                textAlign: "center",
                width: NODE_WIDTH,
                animation: isActiveAgent ? "glow 2.0s infinite" : "none",
                shapeOutside: "circle(50%)",
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

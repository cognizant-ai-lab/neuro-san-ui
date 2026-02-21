import {Edge, EdgeProps, getBezierPath} from "@xyflow/react"
import {FC} from "react"

import {ChatMessageType} from "../../generated/neuro-san/NeuroSanClient"

export interface ThoughtBubbleEdgeData extends Record<string, unknown> {
    text?: string
    showAlways?: boolean
    conversationId?: string
    type?: ChatMessageType
    agents?: string[]
}

export type ThoughtBubbleEdgeShape = Edge<ThoughtBubbleEdgeData, "thoughtBubbleEdge">

type ThoughtBubbleEdgeProps = EdgeProps<ThoughtBubbleEdgeShape>

// Simplified edge component - visual rendering is handled by ThoughtBubbleOverlay
export const ThoughtBubbleEdge: FC<ThoughtBubbleEdgeProps> = ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
}) => {
    const conversationId = data?.conversationId || ""

    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    })

    return (
        <>
            {/* Invisible path for hover detection - visual rendering handled by ThoughtBubbleOverlay */}
            <path
                id={`thought-bubble-hover-${conversationId}`}
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
                style={{pointerEvents: "stroke"}}
            />
        </>
    )
}

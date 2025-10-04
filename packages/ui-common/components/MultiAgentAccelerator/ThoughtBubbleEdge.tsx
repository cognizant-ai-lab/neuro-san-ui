import {FC} from "react"
import {EdgeProps, getBezierPath} from "reactflow"

interface ThoughtBubbleEdgeProps extends EdgeProps {
    data?: {
        text?: string
        showAlways?: boolean
        conversationId?: string
    }
}

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

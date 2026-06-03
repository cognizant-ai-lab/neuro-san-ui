import {BaseEdge, EdgeProps, getBezierPath} from "@xyflow/react"
import {FC} from "react"

export const AnimatedEdge: FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
}) => {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                style={style}
                markerEnd={markerEnd}
            />
            <circle
                id={`${id}-circle`}
                r="6"
                fill="var(--bs-red)"
            >
                <animateMotion
                    id={`${id}-circle-animation`}
                    dur="1s"
                    repeatCount="indefinite"
                    path={edgePath}
                />
            </circle>
        </>
    )
}

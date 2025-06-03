import {FC} from "react"
import {EdgeProps, getBezierPath} from "reactflow"
import {BACKGROUND_COLORS} from "./const"

interface AnimatedEdgeProps {
    markerEnd: object
}

export const AnimatedEdge: FC<EdgeProps<AnimatedEdgeProps>> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
}) => {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    const particleCount = 64
    const beamWidth = 32
    const meanRadius = 3
    const radiusVariance = 1

    return (
        <>
            {Array.from({length: particleCount}).map((_, i) => {
                // Offset perpendicular to the path (simulate beam width)
                const offset = (Math.random() - 0.5) * beamWidth
                // Particle radius varies around meanRadius
                const r = meanRadius + (Math.random() - 0.5) * 2 * radiusVariance
                const opacity = Math.random() * 0.4 + 0.4
                const dur = (Math.random() + 2).toFixed(2) // 2.00s to 3.00s
                const begin = (i * 0.07 + Math.random() * 0.2).toFixed(2)
                return (
                    <g
                        key={`${id}-plasma-particle-group-${i}`}
                        transform={`translate(0, ${offset.toFixed(1)})`}
                    >
                        <circle
                            r={r}
                            fill="url(#plasma-gradient)"
                            opacity={opacity}
                        >
                            <animateMotion
                                dur={`${dur}s`}
                                repeatCount="indefinite"
                                path={edgePath}
                                begin={`${begin}s`}
                            />
                        </circle>
                    </g>
                )
            })}
            <defs>
                <radialGradient
                    id="plasma-gradient"
                    cx="50%"
                    cy="50%"
                    r="50%"
                >
                    <stop
                        offset="0%"
                        stopColor={BACKGROUND_COLORS[0]}
                    />
                    <stop
                        offset="100%"
                        stopColor={BACKGROUND_COLORS[2]}
                    />
                </radialGradient>
            </defs>
        </>
    )
}

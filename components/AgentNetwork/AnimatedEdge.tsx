import {FC} from "react"
import {EdgeProps, getBezierPath} from "reactflow"

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

    const particleCount = 128
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
                        id={`${id}-plasma-particle-group-${i}`}
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${id}-plasma-particle-group-${i}`}
                        transform={`translate(0, ${offset.toFixed(1)})`}
                    >
                        <circle
                            fill="url(#plasma-gradient)"
                            id={`${id}-plasma-particle-circle-${i}`}
                            r={r}
                            opacity={opacity}
                        >
                            <animateMotion
                                begin={`${begin}s`}
                                dur={`${dur}s`}
                                id={`${id}-plasma-particle-animate-motion-${i}`}
                                path={edgePath}
                                repeatCount="indefinite"
                            />
                        </circle>
                    </g>
                )
            })}
            <defs id={`${id}-defs`}>
                <radialGradient
                    id="plasma-gradient"
                    cx="50%"
                    cy="50%"
                    r="50%"
                >
                    <stop
                        id={`${id}-stop-0`}
                        offset="0%"
                        stopColor="var(--bs-green)"
                    />
                    <stop
                        id={`${id}-stop-100`}
                        offset="100%"
                        stopColor="var(--bs-white)"
                    />
                </radialGradient>
            </defs>
        </>
    )
}

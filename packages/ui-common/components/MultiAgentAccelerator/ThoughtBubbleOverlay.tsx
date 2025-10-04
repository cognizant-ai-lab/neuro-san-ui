import {styled} from "@mui/material"
import {FC, Fragment, useCallback, useMemo, useRef, useState} from "react"
import type {Edge, Node as RFNode} from "reactflow"

import {isTextMeaningful, parseInquiryFromText} from "../AgentChat/Utils"

// #region: Types

interface ThoughtBubbleOverlayProps {
    nodes: RFNode[]
    edges: Edge[]
    showThoughtBubbles?: boolean
    onBubbleHoverChange?: (bubbleId: string | null) => void
}
interface ThoughtBubbleProps {
    isHovered: boolean
    animationDelay: number
    bubbleScreenX: number
    bubbleScreenY: number
}

// #endregion: Types

// #region: Styled Components

const OverlayContainer = styled("div")({
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 10000,
})

const ThoughtBubble = styled("div", {
    shouldForwardProp: (prop) =>
        !["isHovered", "animationDelay", "bubbleScreenX", "bubbleScreenY"].includes(prop as string),
})<ThoughtBubbleProps>(({isHovered, animationDelay, bubbleScreenX, bubbleScreenY}) => ({
    position: "absolute",
    right: bubbleScreenX, // Position from right edge instead of left
    top: bubbleScreenY,
    transform: "translateY(-50%)", // Only center vertically, not horizontally
    background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.95) 100%)",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#2d2d2d",
    width: "260px",
    minWidth: "100px",
    minHeight: "auto", // Let height adjust to content
    height: isHovered ? "78px" : "auto", // Fixed height (3 lines) when hovered, flexible when not
    maxHeight: "78px", // Max 3 lines always
    boxShadow: isHovered
        ? "0 4px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)"
        : "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
    zIndex: isHovered ? 10002 : 10000,
    lineHeight: 1.4,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), z-index 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    userSelect: isHovered ? "text" : "none",
    animation: `fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay}ms both`,
    pointerEvents: "auto",
    wordBreak: "break-word",
    overflow: "hidden", // Always hide overflow
    overflowY: isHovered ? "auto" : "hidden", // Enable vertical scrolling only when hovered
    whiteSpace: "normal",
}))

const TruncatedText = styled("div")<{isHovered: boolean}>(({isHovered}) => ({
    display: isHovered ? "block" : "-webkit-box",
    WebkitLineClamp: isHovered ? "unset" : 3,
    WebkitBoxOrient: isHovered ? "unset" : ("vertical" as const),
    overflow: "hidden",
    textOverflow: "ellipsis",
}))

// #endregion: Styled Components

export const ThoughtBubbleOverlay: FC<ThoughtBubbleOverlayProps> = ({
    nodes,
    edges,
    showThoughtBubbles = true,
    onBubbleHoverChange,
}) => {
    // Filter edges with meaningful text
    const thoughtBubbleEdges = edges.filter((e) => {
        if (!e.data || typeof e.data.text !== "string") return false
        const parsed = parseInquiryFromText(e.data.text)
        return isTextMeaningful(parsed)
    })

    const [hoveredBubbleId, setHoveredBubbleId] = useState<string | null>(null)
    const hoverTimeoutRef = useRef<number | null>(null)

    // Find frontman node (depth === 0, same as isFrontman logic in AgentNode.tsx)
    const frontmanNode = useMemo(() => {
        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return null
        return nodes.find((n) => n.data?.depth === 0)
    }, [nodes])

    // Sort edges to prioritize frontman's edges first
    const sortedEdges = useMemo(() => {
        if (!frontmanNode) return thoughtBubbleEdges
        const frontmanEdges = thoughtBubbleEdges.filter(
            (e) => e.source === frontmanNode.id || e.target === frontmanNode.id
        )
        const otherEdges = thoughtBubbleEdges.filter(
            (e) => e.source !== frontmanNode.id && e.target !== frontmanNode.id
        )
        return [...frontmanEdges, ...otherEdges]
    }, [thoughtBubbleEdges, frontmanNode])

    // Notify parent when hover state changes
    const handleHoverChange = useCallback(
        (bubbleId: string | null) => {
            // Clear any pending timeout
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current)
                hoverTimeoutRef.current = null
            }

            if (bubbleId === null) {
                // Delay clearing the hover state when mouse leaves to prevent accidental unhover
                hoverTimeoutRef.current = setTimeout(() => {
                    setHoveredBubbleId(null)
                    if (onBubbleHoverChange) {
                        onBubbleHoverChange(null)
                    }
                }, 200) as unknown as number // 200ms delay before clearing hover
            } else {
                // Immediately set hover when mouse enters
                setHoveredBubbleId(bubbleId)
                if (onBubbleHoverChange) {
                    onBubbleHoverChange(bubbleId)
                }
            }
        },
        [onBubbleHoverChange]
    )

    // Create a stable mapping of edge IDs to vertical positions
    // This prevents bubbles from moving when other bubbles are added/removed
    const edgePositions = useMemo(() => {
        const positions = new Map<string, {row: number; col: number}>()

        // Stack bubbles vertically (one per row, single column)
        sortedEdges.forEach((edge, index) => {
            positions.set(edge.id, {row: index, col: 0})
        })

        return positions
    }, [sortedEdges])

    // Don't render anything if thought bubbles are disabled
    // Note: This MUST come after all hooks to maintain consistent hook ordering
    if (!showThoughtBubbles) return null

    return (
        <OverlayContainer>
            {sortedEdges.map((edge: Edge, index: number) => {
                const text = edge.data?.text
                if (!text) return null

                const parsedText = parseInquiryFromText(text)
                if (!parsedText) return null

                // Find the node to position bubble near
                if (!nodes || !Array.isArray(nodes)) return null

                // If this edge involves the frontman, position bubble near frontman
                // Otherwise position near source node
                const isFrontmanEdge =
                    frontmanNode && (edge.source === frontmanNode.id || edge.target === frontmanNode.id)
                const positionNode = isFrontmanEdge ? frontmanNode : nodes.find((n: RFNode) => n.id === edge.source)
                if (!positionNode) return null

                // Layout bubbles stacked vertically on the right side
                const verticalSpacing = 90 // Spacing between stacked bubbles
                const topMargin = 50 // Distance from top of container
                const rightMargin = 40 // Distance from right edge

                // Stack bubbles vertically (one per row)
                const position = edgePositions.get(edge.id) || {row: 0, col: 0}

                // Position bubbles on the right side, stacked vertically
                // Use right positioning instead of left
                const bubbleRightOffset = rightMargin + 130 // 130 = half bubble width
                const screenYCoord = topMargin + position.row * verticalSpacing

                // Animation delay
                const animationDelay = index * 120

                const isHovered = hoveredBubbleId === edge.id

                // Calculate screen X from the right edge
                // We'll use CSS right positioning in the component
                const bubbleScreenX = bubbleRightOffset
                const bubbleScreenY = screenYCoord

                // Arrow points to the left (west) toward the chart
                const triangleRotation = 90 // Point left (rotate arrow 90 degrees clockwise)

                return (
                    <Fragment key={edge.id}>
                        {/* Thought bubble */}
                        <ThoughtBubble
                            isHovered={isHovered}
                            animationDelay={animationDelay}
                            bubbleScreenX={bubbleScreenX}
                            bubbleScreenY={bubbleScreenY}
                            onMouseEnter={() => handleHoverChange(edge.id)}
                            onMouseLeave={() => handleHoverChange(null)}
                        >
                            <TruncatedText isHovered={isHovered}>{parsedText}</TruncatedText>
                        </ThoughtBubble>
                        {/* Triangle pointer - positioned on left (west) side of bubble, touching it */}
                        <div
                            style={{
                                position: "absolute",
                                // Position to left of bubble, touching edge (arrow width/2 = 12px)
                                right: bubbleScreenX + 260 - 12,
                                top: bubbleScreenY,
                                transform: `translate(0, -50%) rotate(${triangleRotation}deg)`,
                                width: "24px",
                                height: "14px",
                                zIndex: 9999,
                                pointerEvents: "none",
                                filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                            }}
                        >
                            <svg
                                width="24"
                                height="14"
                                viewBox="0 0 24 14"
                                style={{display: "block"}}
                            >
                                <polygon
                                    points="0,0 12,14 24,0"
                                    fill="rgba(255,255,255,0.98)"
                                    stroke="rgba(0, 0, 0, 0.06)"
                                    strokeWidth="1"
                                />
                            </svg>
                        </div>
                    </Fragment>
                )
            })}
        </OverlayContainer>
    )
}

import {styled} from "@mui/material"
import {FC, Fragment, useCallback, useEffect, useMemo, useRef, useState} from "react"
import type {Edge, Node as RFNode} from "reactflow"

// #region: Types

interface ThoughtBubbleOverlayProps {
    readonly nodes: RFNode[]
    readonly edges: Edge[]
    readonly showThoughtBubbles?: boolean
    readonly onBubbleHoverChange?: (bubbleId: string | null) => void
}
interface ThoughtBubbleProps {
    readonly isHovered: boolean
    readonly isTruncated: boolean
    readonly animationDelay: number
    readonly bubbleScreenX: number
    readonly bubbleScreenY: number
}

// #endregion: Types

// #region: Constants

const BUBBLE_ARROW_HEIGHT = 14
const BUBBLE_ARROW_WIDTH = 24
const BUBBLE_HEIGHT = 78
const BUBBLE_WIDTH = 260

const LAYOUT_BUBBLES_ANIMATION_DELAY_MS = 120 // Delay between each bubble's animation start
const LAYOUT_BUBBLES_TOP_MARGIN = 50 // Distance from top of container
const LAYOUT_BUBBLES_RIGHT_MARGIN = 40 // Distance from right edge
const LAYOUT_BUBBLES_TRIANGLE_ROTATION = 90 // Point left (rotate arrow 90 degrees clockwise)
const LAYOUT_BUBBLES_VERTICAL_SPACING = 90 // Spacing between stacked bubbles

// #endregion: Constants

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
        !["isHovered", "isTruncated", "animationDelay", "bubbleScreenX", "bubbleScreenY"].includes(prop as string),
})<ThoughtBubbleProps>(({theme, isHovered, isTruncated, animationDelay, bubbleScreenX, bubbleScreenY}) => ({
    // Colors / theme
    // TODO: Add dark mode support? For now both light and dark mode use the same thought bubble style and look fine.
    background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.95) 100%)",
    border: "var(--bs-border-width) var(--bs-border-style) var(--bs-border-color)",
    borderRadius: "var(--bs-border-radius-lg)",
    color: "var(--bs-primary)",
    fontFamily: theme.typography.fontFamily, // TODO: Easy to pull from theme. Rest we need to revisit.
    fontSize: "var(--bs-body-font-size-extra-small)",
    fontWeight: "var(--bs-body-font-weight)",
    padding: "10px 14px",

    // Positioning
    position: "absolute",
    right: bubbleScreenX, // Position from right edge instead of left
    top: bubbleScreenY,
    transform: "translateY(-50%)", // Only center vertically, not horizontally

    // Dimensions
    height: isHovered && isTruncated ? BUBBLE_HEIGHT : "auto", // Only expand height when hovered AND text is truncated
    maxHeight: BUBBLE_HEIGHT, // Max 3 lines always
    minHeight: "auto", // Let height adjust to content
    minWidth: "100px",
    width: BUBBLE_WIDTH,

    // Other styles
    boxShadow: isHovered
        ? "0 4px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)"
        : "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
    zIndex: isHovered ? 10002 : 10000,
    lineHeight: 1.4,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), z-index 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: isTruncated ? "pointer" : "default",
    userSelect: isHovered && isTruncated ? "text" : "none",
    animation: `fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay}ms both`,
    pointerEvents: "auto",
    wordBreak: "break-word",
    overflow: "hidden", // Always hide overflow
    // Enable vertical scrolling only when hovered and truncated
    overflowY: isHovered && isTruncated ? "auto" : "hidden",
    whiteSpace: "normal",
}))

const TruncatedText = styled("div")<{isHovered: boolean; isTruncated: boolean}>(({isHovered, isTruncated}) => ({
    display: isHovered && isTruncated ? "block" : "-webkit-box",
    WebkitLineClamp: isHovered && isTruncated ? "unset" : 3,
    WebkitBoxOrient: isHovered && isTruncated ? "unset" : ("vertical" as const),
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
    // hoveredBubbleId: id of currently hovered bubble (or null)
    const [hoveredBubbleId, setHoveredBubbleId] = useState<string | null>(null)
    // truncatedBubbles: set of edge ids whose text overflows the collapsed box
    const [truncatedBubbles, setTruncatedBubbles] = useState<Set<string>>(new Set())
    // hoverTimeoutRef: used to debounce clearing of hovered state on mouse leave
    const hoverTimeoutRef = useRef<number | null>(null)
    // textRefs: mapping of edge id -> DOM node for measuring scrollHeight/clientHeight
    const textRefs = useRef<Map<string, HTMLDivElement>>(new Map())

    // Filter edges with meaningful text
    const thoughtBubbleEdges = edges.filter((e) => {
        if (typeof e?.data?.text !== "string") {
            return false
        }
        return e.data.text
    })

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

    // Check truncation after render, but only when nothing is hovered
    // (to avoid measuring expanded bubbles)
    useEffect(() => {
        // Skip truncation check if any bubble is hovered
        if (hoveredBubbleId !== null) return

        const newTruncated = new Set<string>()

        textRefs.current.forEach((element, edgeId) => {
            // If scrollHeight > clientHeight then the content overflows (truncated)
            if (element && element.scrollHeight > element.clientHeight) {
                newTruncated.add(edgeId)
            }
        })

        setTruncatedBubbles((prev) => {
            // Only update if something changed
            if (prev.size !== newTruncated.size) return newTruncated

            // Check if the contents are the same
            for (const id of newTruncated) {
                if (!prev.has(id)) return newTruncated
            }

            return prev
        })
    }, [hoveredBubbleId, sortedEdges, textRefs]) // Re-check when edges change or hover state changes

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
                // "window." to satisfy typescript
                hoverTimeoutRef.current = window.setTimeout(() => {
                    setHoveredBubbleId(null)
                    if (onBubbleHoverChange) {
                        onBubbleHoverChange(null)
                    }
                }, 200) // 200ms delay before clearing hover
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

                // Find the node to position bubble near
                if (!nodes || !Array.isArray(nodes)) return null

                // If this edge involves the frontman, position bubble near frontman
                // Otherwise position near source node
                const isFrontmanEdge =
                    frontmanNode && (edge.source === frontmanNode.id || edge.target === frontmanNode.id)
                const positionNode = isFrontmanEdge ? frontmanNode : nodes.find((n: RFNode) => n.id === edge.source)
                if (!positionNode) return null

                // Stack bubbles vertically (one per row)
                const position = edgePositions.get(edge.id) || {row: 0, col: 0}

                // Position bubbles on the right side, stacked vertically
                const bubbleRightOffset = LAYOUT_BUBBLES_RIGHT_MARGIN + BUBBLE_WIDTH / 2
                const screenYCoord = LAYOUT_BUBBLES_TOP_MARGIN + position.row * LAYOUT_BUBBLES_VERTICAL_SPACING

                // Per-bubble staggered animation delay in milliseconds
                const animationDelay = index * LAYOUT_BUBBLES_ANIMATION_DELAY_MS

                const isHovered = hoveredBubbleId === edge.id
                const isTruncated = truncatedBubbles.has(edge.id)

                // Calculate screen X from the right edge
                // We'll use CSS right positioning in the component
                const bubbleScreenX = bubbleRightOffset
                const bubbleScreenY = screenYCoord

                return (
                    <Fragment key={edge.id}>
                        <ThoughtBubble
                            isHovered={isHovered}
                            isTruncated={isTruncated}
                            animationDelay={animationDelay}
                            bubbleScreenX={bubbleScreenX}
                            bubbleScreenY={bubbleScreenY}
                            onMouseEnter={() => handleHoverChange(edge.id)}
                            onMouseLeave={() => handleHoverChange(null)}
                        >
                            <TruncatedText
                                isHovered={isHovered}
                                isTruncated={isTruncated}
                                ref={(el: HTMLDivElement | null) => {
                                    // Store/remove this text node in `textRefs` for truncation checks.
                                    if (el) {
                                        textRefs.current.set(edge.id, el)
                                    } else {
                                        textRefs.current.delete(edge.id)
                                    }
                                }}
                            >
                                {text}
                            </TruncatedText>
                        </ThoughtBubble>
                        {/* Triangle pointer - positioned on the left side of the bubble and pointing left */}
                        <div
                            style={{
                                position: "absolute",
                                // Position to left of bubble, touching edge (arrow width / 2)
                                right: bubbleScreenX + BUBBLE_WIDTH - BUBBLE_ARROW_WIDTH / 2,
                                top: bubbleScreenY,
                                transform: `translate(0, -50%) rotate(${LAYOUT_BUBBLES_TRIANGLE_ROTATION}deg)`,
                                width: BUBBLE_ARROW_WIDTH,
                                height: BUBBLE_ARROW_HEIGHT,
                                zIndex: 9999,
                                pointerEvents: "none",
                                filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                            }}
                        >
                            <svg
                                width={BUBBLE_ARROW_WIDTH}
                                height={BUBBLE_ARROW_HEIGHT}
                                viewBox="0 0 24 14"
                                style={{display: "block"}}
                            >
                                <polygon
                                    // Draws a left-pointing triangle used as the bubble’s arrow pointer
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

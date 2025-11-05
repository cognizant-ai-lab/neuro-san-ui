import {styled} from "@mui/material"
import {FC, Fragment, useCallback, useEffect, useMemo, useRef, useState} from "react"
import type {Edge, Node as RFNode} from "reactflow"
import {useStore} from "reactflow"

import {ChatMessageType} from "../../generated/neuro-san/NeuroSanClient"

// #region: Types

interface ThoughtBubbleOverlayProps {
    readonly nodes: RFNode[]
    readonly edges: Edge[]
    readonly showThoughtBubbles?: boolean
    readonly isStreaming?: boolean
    readonly onBubbleHoverChange?: (bubbleId: string | null) => void
}
interface ThoughtBubbleProps {
    readonly isHovered: boolean
    readonly isTruncated: boolean
    readonly animationDelay: number
    readonly bubbleIndex: number
    readonly isVisible?: boolean
    readonly isExiting?: boolean
}
// Note: Removed BubblePosition interface - no longer needed for right-side positioning

// #endregion: Types

// #region: Constants

const BUBBLE_HEIGHT = 78
const BUBBLE_WIDTH = 260

const LAYOUT_BUBBLES_ANIMATION_DELAY_MS = 120 // Delay between each bubble's animation start

// Constants for connecting lines
const CONNECTING_LINE_OPACITY = 0.3 // Semi-transparent connecting line

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
        ![
            "isHovered",
            "isTruncated",
            "animationDelay",
            "bubbleIndex",
            "isVisible",
            "isExiting",
        ].includes(prop as string),
})<ThoughtBubbleProps>(
    ({
        theme,
        isHovered,
        isTruncated,
        animationDelay,
        bubbleIndex,
        isVisible = true,
        isExiting = false,
    }) => ({
        // Colors / theme
        // TODO: Add dark mode support? For now both light and dark mode use the same bubble style and look fine.
        background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.95) 100%)",
        border: "var(--bs-border-width) var(--bs-border-style) var(--bs-border-color)",
        borderRadius: "var(--bs-border-radius-lg)",
        color: "var(--bs-primary)",
        fontFamily: theme.typography.fontFamily, // TODO: Easy to pull from theme. Rest we need to revisit.
        fontSize: "var(--bs-body-font-size-extra-small)",
        fontWeight: "var(--bs-body-font-weight)",
        padding: "10px 14px",

        // Positioning - restore original right-side layout
        position: "absolute",
        right: 20, // Fixed distance from right edge
        top: 70 + bubbleIndex * (BUBBLE_HEIGHT + 10), // Stack vertically with spacing (50px offset from top)
        transform: "none",

        // Dimensions
        // Only expand height when hovered AND text is truncated
        height: isHovered && isTruncated ? BUBBLE_HEIGHT : "auto",
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
        transition: `box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
            z-index 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
        cursor: isTruncated ? "pointer" : "default",
        userSelect: isHovered && isTruncated ? "text" : "none",
        animation: isExiting
            ? "fadeOutDown 0.4s cubic-bezier(0.4, 0, 0.1, 1) both"
            : `fadeInUp 0.6s cubic-bezier(0.2, 0, 0.2, 1) ${animationDelay}ms both`,
        opacity: isVisible ? (isExiting ? 0 : 1) : 0,
        pointerEvents: "auto",
        wordBreak: "break-word",
        overflow: "hidden", // Always hide overflow
        // Enable vertical scrolling only when hovered and truncated
        overflowY: isHovered && isTruncated ? "auto" : "hidden",
        whiteSpace: "normal",
    })
)

const TruncatedText = styled("div")<{isHovered: boolean; isTruncated: boolean}>(({isHovered, isTruncated}) => ({
    display: isHovered && isTruncated ? "block" : "-webkit-box",
    WebkitLineClamp: isHovered && isTruncated ? "unset" : 3,
    WebkitBoxOrient: isHovered && isTruncated ? "unset" : ("vertical" as const),
    overflow: "hidden",
    textOverflow: "ellipsis",
}))

// #endregion: Styled Components

// Note: Removed calculateBubblePosition - bubbles now use simple right-side positioning

export const ThoughtBubbleOverlay: FC<ThoughtBubbleOverlayProps> = ({
    nodes,
    edges,
    showThoughtBubbles = true,
    isStreaming = false,
    onBubbleHoverChange,
}) => {
    // hoveredBubbleId: id of currently hovered bubble (or null)
    const [hoveredBubbleId, setHoveredBubbleId] = useState<string | null>(null)
    // truncatedBubbles: set of edge ids whose text overflows the collapsed box
    const [truncatedBubbles, setTruncatedBubbles] = useState<Set<string>>(new Set())
    // bubbleStates: track animation state of each bubble
    const [bubbleStates, setBubbleStates] = useState<Map<string, {isVisible: boolean; isExiting: boolean}>>(new Map())
    // hoverTimeoutRef: used to debounce clearing of hovered state on mouse leave
    const hoverTimeoutRef = useRef<number | null>(null)
    // textRefs: mapping of edge id -> DOM node for measuring scrollHeight/clientHeight
    const textRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    // animationTimeouts: track timeouts for bubble removal
    const animationTimeouts = useRef<Map<string, number>>(new Map())
    // Refs for SVG lines to update without re-rendering
    const lineRefs = useRef<Map<string, SVGLineElement>>(new Map())

    // Get React Flow transform state for positioning calculations
    // Provide a fallback for tests that don't have ReactFlowProvider context
    let transform: [number, number, number]
    try {
        transform = useStore((state) => state.transform)
    } catch {
        // Fallback for tests - default transform (no pan/zoom)
        transform = [0, 0, 1]
    }

    // Filter edges with meaningful text (memoized to prevent infinite re-renders)
    const thoughtBubbleEdges = useMemo(
        () =>
            edges.filter((e) => {
                if (typeof e?.data?.text !== "string") {
                    return false
                }
                return e.data.text
            }),
        [edges]
    )

    // Find frontman node (depth === 0, same as isFrontman logic in AgentNode.tsx)
    const frontmanNode = useMemo(() => {
        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return null
        return nodes.find((n) => n.data?.depth === 0)
    }, [nodes])

    // Handle bubble lifecycle (appear/disappear animations)
    useEffect(() => {
        const currentEdgeIds = new Set(thoughtBubbleEdges.map((e) => e.id))
        const previousBubbleIds = new Set(bubbleStates.keys())

        // Find new bubbles that should appear
        const newBubbles = thoughtBubbleEdges.filter((e) => !previousBubbleIds.has(e.id))

        // Find bubbles that should disappear
        const removingBubbles = Array.from(previousBubbleIds).filter((id) => !currentEdgeIds.has(id))

        setBubbleStates((prev) => {
            const newState = new Map(prev)

            // Add new bubbles in entering state
            newBubbles.forEach((edge) => {
                newState.set(edge.id, {isVisible: true, isExiting: false})
            })

            // Mark removing bubbles as exiting
            removingBubbles.forEach((id) => {
                const currentState = newState.get(id)
                if (currentState) {
                    newState.set(id, {...currentState, isExiting: true})

                    // Clear any existing timeout
                    const existingTimeout = animationTimeouts.current.get(id)
                    if (existingTimeout) {
                        clearTimeout(existingTimeout)
                    }

                    // Schedule removal after exit animation
                    const timeout = window.setTimeout(() => {
                        setBubbleStates((s) => {
                            const updatedState = new Map(s)
                            updatedState.delete(id)
                            return updatedState
                        })
                        animationTimeouts.current.delete(id)
                    }, 400) // Match exit animation duration (0.4s)

                    animationTimeouts.current.set(id, timeout)
                }
            })

            return newState
        })
    }, [thoughtBubbleEdges])

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            animationTimeouts.current.forEach((timeout) => clearTimeout(timeout))
            animationTimeouts.current.clear()
        }
    }, [])

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

    // Calculate line coordinates fresh every render - no caching, just accuracy
    const calculateLineCoordinates = useCallback((edge: Edge, bubbleIndex: number) => {
        // Skip HUMAN conversation types - no lines for human bubbles
        // Note: HUMAN is a conversation type, not text content
        if (edge.data?.type === ChatMessageType.HUMAN) {
            return null
        }

        // Get actual bubble DOM position (fresh every time)
        const bubbleElement = document.querySelector(`[data-bubble-id="${edge.id}"]`)
        let bubbleX = 0
        let bubbleY = 0
        
        if (bubbleElement) {
            const bubbleRect = bubbleElement.getBoundingClientRect()
            // Use the left edge center of the bubble (where line should start)  
            bubbleX = Math.round(bubbleRect.left)
            bubbleY = Math.round(bubbleRect.top + bubbleRect.height / 2)
            
            console.log(`🔵 Bubble ${edge.id}: rect(${bubbleRect.left}, ${bubbleRect.top}, ${bubbleRect.width}x${bubbleRect.height}) -> (${bubbleX}, ${bubbleY})`)
        } else {
            // Fallback: calculate approximate viewport position
            bubbleX = window.innerWidth - 20 - BUBBLE_WIDTH
            bubbleY = 70 + bubbleIndex * (BUBBLE_HEIGHT + 10) + BUBBLE_HEIGHT / 2
            console.log(`❌ No bubble element found for ${edge.id}, using fallback: (${bubbleX}, ${bubbleY})`)
        }
        
        // Get target agent using simple stable distribution
        const availableAgents = nodes.filter(node => {
            return node.type === 'agentNode' && 
                   !node.id.includes('URLProvider') &&
                   !node.id.includes('ExtractDocs') &&
                   !node.id.includes('Airline_360_Assistant')
        })
        
        if (availableAgents.length === 0) return null
        
        // Simple stable hash for consistent targeting
        const createStableHash = (str: string): number => {
            let hash = 0
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i)
                hash = ((hash << 5) - hash) + char
                hash = hash & hash
            }
            return Math.abs(hash)
        }
        
        const conversationId = edge.id.replace('thought-bubble-', '')
        const stableIndex = createStableHash(conversationId) % availableAgents.length
        const targetAgent = availableAgents[stableIndex]
        
        if (!targetAgent) return null

        // Get actual agent DOM position (fresh every time)
        const agentElements = document.querySelectorAll(`[data-id="${targetAgent.id}"].react-flow__node`)
        let agentX = 0
        let agentY = 0
        
        if (agentElements[0]) {
            const agentElement = agentElements[0]
            
            // The React Flow node container should give us the right position
            const containerRect = agentElement.getBoundingClientRect()
            agentX = Math.round(containerRect.left + containerRect.width / 2)
            agentY = Math.round(containerRect.top + containerRect.height / 2)
            
            console.log(`🔴 Agent ${targetAgent.id}: container rect(${containerRect.left}, ${containerRect.top}, ${containerRect.width}x${containerRect.height}) -> (${agentX}, ${agentY})`)
        } else {
            console.log(`❌ No agent element found for ${targetAgent.id}`)
        }

        return {
            x1: bubbleX,
            y1: bubbleY,
            x2: agentX,
            y2: agentY,
            targetAgent: targetAgent.id
        }
    }, [nodes])



    // Don't render anything if thought bubbles are disabled
    // Note: This MUST come after all hooks to maintain consistent hook ordering
    if (!showThoughtBubbles) return null

    // Get all bubbles to render (including exiting ones)
    const allBubbleIds = Array.from(bubbleStates.keys())
    const renderableBubbles = allBubbleIds
        .map((id) => {
            // Try to find the edge in current edges first
            let edge = sortedEdges.find((e) => e.id === id)
            if (!edge) {
                // If not found, this is an exiting bubble - find it in all edges
                edge = edges.find((e) => e.id === id)
            }
            return edge
        })
        .filter((edge): edge is Edge => edge !== undefined)

    return (
        <OverlayContainer>
            {/* Single SVG container for ALL lines - positioned to match viewport */}
            <svg
                style={{
                    position: "fixed",
                    left: 0,
                    top: 0,
                    width: "100vw",
                    height: "100vh",
                    pointerEvents: "none",
                    zIndex: 9998,
                    opacity: 1,
                }}
            >
                {/* Dynamic lines - coordinates calculated fresh every render */}
                {renderableBubbles.map((edge: Edge, index: number) => {
                    const bubbleState = bubbleStates.get(edge.id) || {isVisible: true, isExiting: false}
                    if (!bubbleState.isVisible) return null
                    
                    // Calculate fresh coordinates for this line
                    const coords = calculateLineCoordinates(edge, index)
                    if (!coords) return null
                    
                    return (
                        <g key={`line-group-${edge.id}`}>
                            {/* The actual connecting line */}
                            <line
                                key={`line-${edge.id}`}
                                ref={(el: SVGLineElement | null) => {
                                    if (el) {
                                        lineRefs.current.set(edge.id, el)
                                    } else {
                                        lineRefs.current.delete(edge.id)
                                    }
                                }}
                                x1={coords.x1}
                                y1={coords.y1}
                                x2={coords.x2}
                                y2={coords.y2}
                                stroke="rgba(255, 100, 100, 0.6)"
                                strokeWidth="2"
                                strokeDasharray="3,3"
                            />
                        </g>
                    )
                })}
            </svg>
            
            {renderableBubbles.map((edge: Edge, index: number) => {
                const text = edge.data?.text
                if (!text) return null

                // Per-bubble staggered animation delay in milliseconds
                const animationDelay = index * LAYOUT_BUBBLES_ANIMATION_DELAY_MS

                const isHovered = hoveredBubbleId === edge.id
                const isTruncated = truncatedBubbles.has(edge.id)
                const bubbleState = bubbleStates.get(edge.id) || {isVisible: true, isExiting: false}

                // Bubble positioning is handled by CSS, line coordinates handled by interval

                return (
                    <Fragment key={edge.id}>
                        <ThoughtBubble
                            data-bubble-id={edge.id}
                            isHovered={isHovered}
                            isTruncated={isTruncated}
                            animationDelay={animationDelay}
                            bubbleIndex={index}
                            isVisible={bubbleState.isVisible}
                            isExiting={bubbleState.isExiting}
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
                    </Fragment>
                )
            })}
        </OverlayContainer>
    )
}

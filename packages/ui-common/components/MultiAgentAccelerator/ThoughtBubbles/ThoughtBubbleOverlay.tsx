import {styled} from "@mui/material/styles"
import {FC, Fragment, useCallback, useEffect, useMemo, useRef} from "react"

import {ThoughtBubble} from "./StyledThoughtBubble"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {AgentConversation} from "../AgentConversations"

// #region: Types

interface ThoughtBubbleOverlayProps {
    readonly currentConversations: AgentConversation[]
}

interface RenderableBubble {
    readonly id: string
    readonly conversationId: string
    readonly text: string
    readonly agents: string[]
    readonly type: ChatMessageType
    readonly timestamp: number
}
// #endregion: Types

// #region: Constants

const BUBBLE_DISTANCE_FROM_RIGHT_EDGE = 20 // Fixed distance from right edge
const BUBBLE_HEIGHT = 78
const BUBBLE_HEIGHT_PLUS_SPACING = BUBBLE_HEIGHT + 10
const BUBBLE_STACK_OFFSET_TOP = 70
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

const TruncatedText = styled("div")<{isHovered: boolean; isTruncated: boolean}>(({isHovered, isTruncated}) => ({
    display: isHovered && isTruncated ? "block" : "-webkit-box",
    WebkitLineClamp: isHovered && isTruncated ? "unset" : 3,
    WebkitBoxOrient: isHovered && isTruncated ? "unset" : ("vertical" as const),
    overflow: "hidden",
    textOverflow: "ellipsis",
}))

// #endregion: Styled Components

export const ThoughtBubbleOverlay: FC<ThoughtBubbleOverlayProps> = ({currentConversations}) => {
    // textRefs: mapping of edge id -> DOM node for measuring scrollHeight/clientHeight
    const textRefs = useRef<Map<string, HTMLDivElement>>(new Map())

    // animationTimeouts: track timeouts for bubble removal
    const animationTimeouts = useRef<Map<string, number | ReturnType<typeof setTimeout>>>(new Map())

    // Refs for SVG lines to update without re-rendering
    const lineRefs = useRef<Map<string, SVGLineElement>>(new Map())

    // Cleanup timeouts on unmount
    useEffect(() => {
        const timeouts = animationTimeouts.current
        return () => {
            timeouts.forEach((timeout) => clearTimeout(timeout))
            timeouts.clear()
        }
    }, [])

    // Calculate line coordinates - measurement only. Can be called from rAF/update loop.
    const calculateLineCoordinates = useCallback(
        (
            bubble: RenderableBubble,
            bubbleIndex: number,
            agentRectCache?: Map<string, DOMRect>
        ): {x1: number; y1: number; x2: number; y2: number; targetAgent: string}[] | null => {
            if (bubble.type === ChatMessageType.HUMAN) {
                return null
            }

            // Get actual bubble DOM position (fresh every time)
            const bubbleElement = document.querySelector(`[data-bubble-id="${CSS.escape(bubble.id)}"]`)
            let bubbleX: number
            let bubbleY: number

            if (bubbleElement) {
                const bubbleRect = bubbleElement.getBoundingClientRect()
                // Use the left edge center of the bubble (where line should start)
                bubbleX = Math.round(bubbleRect.left)
                bubbleY = Math.round(bubbleRect.top + bubbleRect.height / 2)
            } else {
                // Fallback: calculate approximate viewport position
                bubbleX = window.innerWidth - BUBBLE_DISTANCE_FROM_RIGHT_EDGE - BUBBLE_WIDTH
                bubbleY = BUBBLE_STACK_OFFSET_TOP + bubbleIndex * BUBBLE_HEIGHT_PLUS_SPACING + BUBBLE_HEIGHT / 2
            }

            // Determine which agents to point to. If the edge supplies an `agents` array in
            // data (provided by AgentFlow), use that. Otherwise, fallback to the explicit
            // edge.target/edge.source pair (single target).
            const agentIds = bubble.agents

            if (agentIds.length === 0) return null

            // For each agent id, find its visual element and calculate mid-point.
            const results: {x1: number; y1: number; x2: number; y2: number; targetAgent: string}[] = []

            for (const agentId of agentIds) {
                // Find the agent element by its data-id attribute
                const agentElements = document.querySelectorAll(`[data-id="${CSS.escape(agentId)}"].react-flow__node`)
                const foundAgentEl = agentElements?.[0] || null

                let agentX = 0
                let agentY = 0

                if (foundAgentEl) {
                    // Prefer the cached rect when present; otherwise compute and cache it.
                    const cachedRect = agentRectCache?.get(agentId)
                    const containerRect = cachedRect ?? foundAgentEl.getBoundingClientRect()
                    if (cachedRect == null) {
                        agentRectCache?.set(agentId, containerRect)
                    }

                    if (containerRect) {
                        agentX = Math.round(containerRect.left + containerRect.width / 2)
                        agentY = Math.round(containerRect.top + containerRect.height / 2)
                    }
                }

                results.push({x1: bubbleX, y1: bubbleY, x2: agentX, y2: agentY, targetAgent: agentId})
            }

            return results
        },
        []
    )

    const renderableBubbles: RenderableBubble[] = useMemo(() => {
        return currentConversations
            ?.map((conversation): RenderableBubble | null => {
                const text = conversation.text?.trim()
                const agents = [...conversation.agents]

                if (!text || agents.length === 0) return null

                return {
                    id: `thought-bubble-${conversation.id}`,
                    conversationId: conversation.id,
                    text,
                    agents,
                    type: conversation.type,
                    timestamp: conversation.startedAt.getTime(),
                }
            })
            .filter((bubble): bubble is RenderableBubble => bubble !== null)
    }, [currentConversations])

    return (
        <OverlayContainer>
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
                {renderableBubbles?.map((bubble, index) => {
                    // Per-bubble staggered animation delay in milliseconds (for line animations)
                    const animationDelay = index * LAYOUT_BUBBLES_ANIMATION_DELAY_MS

                    // Calculate fresh coordinates for this line (may return multiple targets)
                    const coordsArray = calculateLineCoordinates(bubble, index) as
                        {x1: number; y1: number; x2: number; y2: number; targetAgent: string}[] | null

                    if (!coordsArray || coordsArray.length === 0) return null

                    return (
                        <g key={`line-group-${bubble.id}`}>
                            {coordsArray.map((coords) => {
                                const lineKey = `${bubble.id}-${coords.targetAgent}`
                                return (
                                    <line
                                        key={`line-${lineKey}`}
                                        ref={(el: SVGLineElement | null) => {
                                            if (el) {
                                                lineRefs.current.set(lineKey, el)
                                            } else {
                                                lineRefs.current.delete(lineKey)
                                            }
                                        }}
                                        x1={coords.x1}
                                        y1={coords.y1}
                                        x2={coords.x2}
                                        y2={coords.y2}
                                        stroke="var(--thought-bubble-line-color)"
                                        strokeWidth="3"
                                        strokeDasharray="3,3"
                                        style={{
                                            opacity: CONNECTING_LINE_OPACITY,
                                            transition: (() => {
                                                const duration = 600
                                                return (
                                                    `opacity ${duration}ms cubic-bezier(0.2, 0, 0.2, 1) ` +
                                                    `${animationDelay}ms`
                                                )
                                            })(),
                                        }}
                                    />
                                )
                            })}
                        </g>
                    )
                })}
            </svg>

            {renderableBubbles?.map((bubble, index) => {
                const text = bubble?.text
                if (!text) return null

                // Per-bubble staggered animation delay in milliseconds
                const animationDelay = index * LAYOUT_BUBBLES_ANIMATION_DELAY_MS

                const isHovered = false
                const isTruncated = false
                const bubbleState = {isVisible: true, isExiting: false}

                return (
                    <Fragment key={bubble.id}>
                        <ThoughtBubble
                            data-bubble-id={bubble.id}
                            isHovered={isHovered}
                            isTruncated={isTruncated}
                            animationDelay={animationDelay}
                            bubbleIndex={index}
                            isVisible={bubbleState.isVisible}
                            isExiting={bubbleState.isExiting}
                            // onMouseEnter={() => handleHoverChange(edge.id)}
                            // onMouseLeave={() => handleHoverChange(null)}
                        >
                            <TruncatedText
                                isHovered={isHovered}
                                isTruncated={isTruncated}
                                ref={(el: HTMLDivElement | null) => {
                                    // Store/remove this text node in `textRefs` for truncation checks.
                                    if (el) {
                                        textRefs.current.set(bubble.id, el)
                                    } else {
                                        textRefs.current.delete(bubble.id)
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

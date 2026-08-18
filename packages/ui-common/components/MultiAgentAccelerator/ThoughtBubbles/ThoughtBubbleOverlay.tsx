import {styled} from "@mui/material/styles"
import Typography from "@mui/material/Typography"
import {FC, Fragment, useCallback, useEffect, useMemo, useRef} from "react"

import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {AgentConversation} from "../AgentConversations"
import {ThoughtBubble} from "./ThoughtBubble"

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
const BUBBLE_HEIGHT = 125
const BUBBLE_HEIGHT_PLUS_SPACING = BUBBLE_HEIGHT + 10
const BUBBLE_STACK_OFFSET_TOP = 70
const BUBBLE_WIDTH = 250

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
styled("div")<{isHovered: boolean; isTruncated: boolean}>(({isHovered, isTruncated}) => ({
    display: isHovered && isTruncated ? "block" : "-webkit-box",
    WebkitLineClamp: isHovered && isTruncated ? "unset" : 3,
    WebkitBoxOrient: isHovered && isTruncated ? "unset" : ("vertical" as const),
    overflow: "hidden",
    textOverflow: "ellipsis",
}))
// #endregion: Styled Components

export const ThoughtBubbleOverlay: FC<ThoughtBubbleOverlayProps> = ({currentConversations}) => {
    // animationTimeouts: track timeouts for bubble removal
    const animationTimeouts = useRef<Map<string, number | ReturnType<typeof setTimeout>>>(new Map())

    // Cleanup timeouts on unmount
    useEffect(() => {
        const timeouts = animationTimeouts.current
        return () => {
            timeouts.forEach((timeout) => clearTimeout(timeout))
            timeouts.clear()
        }
    }, [])

    // Calculate line coordinates - measurement only. Can be called from rAF/update loop.
    useCallback(
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
    const BUBBLE_OFFSET_X = 8
    const BUBBLE_OFFSET_Y = 24

    const getBubblePositionForNode = (bubble: RenderableBubble) => {
        const agentId = bubble.agents[0]
        if (!agentId) {
            return {
                left: window.innerWidth - BUBBLE_DISTANCE_FROM_RIGHT_EDGE - BUBBLE_WIDTH,
                top: BUBBLE_STACK_OFFSET_TOP,
            }
        }

        const node = document.querySelector(`[data-id="${CSS.escape(agentId)}"].react-flow__node`)

        if (!node) {
            return {
                left: window.innerWidth - BUBBLE_DISTANCE_FROM_RIGHT_EDGE - BUBBLE_WIDTH,
                top: BUBBLE_STACK_OFFSET_TOP,
            }
        }

        const rect = node.getBoundingClientRect()

        const left = rect.right - 30 + BUBBLE_OFFSET_X / 4
        const topPos = rect.top - BUBBLE_HEIGHT / 2 - BUBBLE_OFFSET_Y

        return {
            left: Math.min(left, window.innerWidth - BUBBLE_WIDTH - BUBBLE_DISTANCE_FROM_RIGHT_EDGE),
            top: Math.max(topPos, 20),
        }
    }
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
            {renderableBubbles?.map((bubble) => {
                const text = bubble?.text
                if (!text) return null

                const position = getBubblePositionForNode(bubble)

                return (
                    <Fragment key={bubble.id}>
                        <ThoughtBubble
                            backgroundColor="#EEF2FF"
                            color="#6366F1"
                            textColor="var(--bs-red)"
                            width={BUBBLE_WIDTH}
                            height={BUBBLE_HEIGHT}
                            style={{
                                position: "fixed",
                                left: position.left,
                                top: position.top,
                                pointerEvents: "auto",
                            }}
                            data-bubble-id={bubble.id}
                        >
                            <Typography
                                sx={{
                                    borderRadius: 1,
                                    display: "-webkit-box",
                                    fontSize: "8px",
                                    fontWeight: "700",
                                    overflow: "hidden",
                                    overflowWrap: "anywhere",
                                    px: 0.25,
                                    paddingBottom: 0,
                                    paddingTop: 0,
                                    textAlign: "center",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: 4,
                                }}
                            >
                                {text}
                            </Typography>
                        </ThoughtBubble>
                    </Fragment>
                )
            })}
        </OverlayContainer>
    )
}

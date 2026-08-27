import {styled} from "@mui/material/styles"
import {FC, useEffect, useMemo, useRef} from "react"

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

export const ThoughtBubbles: FC<ThoughtBubbleOverlayProps> = ({currentConversations}) => {
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
            leftPos: Math.min(left, window.innerWidth - BUBBLE_WIDTH - BUBBLE_DISTANCE_FROM_RIGHT_EDGE),
            topPos: Math.max(topPos, 20),
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
                const {id, text} = bubble

                if (!text) {
                    return null
                }

                const {leftPos, topPos} = getBubblePositionForNode(bubble)

                return (
                    <ThoughtBubble
                        backgroundColor="#EEF2FF"
                        color="#6366F1"
                        data-bubble-id={id}
                        height={BUBBLE_HEIGHT}
                        key={id}
                        style={{left: leftPos, pointerEvents: "auto", position: "fixed", top: topPos}}
                        text={text}
                        textColor="var(--bs-red)"
                        width={BUBBLE_WIDTH}
                    />
                )
            })}
        </OverlayContainer>
    )
}

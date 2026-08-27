import {styled} from "@mui/material/styles"
import {FC} from "react"

import {AgentConversation} from "../AgentConversations"
import {ThoughtBubble} from "./ThoughtBubble"

//#region: Types
interface ThoughtBubblesProps {
    readonly currentConversations: AgentConversation[]
}
//#endregion: Types

//#region: Constants

const BUBBLE_DISTANCE_FROM_RIGHT_EDGE = 20
const BUBBLE_HEIGHT = 125
const BUBBLE_OFFSET_X = 2
const BUBBLE_OFFSET_Y = 24
const BUBBLE_STACK_OFFSET_TOP = 70
const BUBBLE_WIDTH = 250

const MAX_BUBBLES = 5

//#endregion: Constants

//#region: Styled Components

const OverlayContainer = styled("div")({
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 10000,
})

//#endregion: Styled Components

/**
 * Thought bubbles overlay component.
 */
export const ThoughtBubbles: FC<ThoughtBubblesProps> = ({currentConversations}) => {
    const getBubblePositionForNode: (conversation: AgentConversation) => {leftPos: number; topPos: number} = (
        conversation: AgentConversation
    ) => {
        // Get the target agent ID from the conversation
        const agentId = [...conversation.agents].at(-1)
        if (!agentId) {
            return {
                leftPos: window.innerWidth - BUBBLE_DISTANCE_FROM_RIGHT_EDGE - BUBBLE_WIDTH,
                topPos: BUBBLE_STACK_OFFSET_TOP,
            }
        }

        const node = document.querySelector(`[data-id="${CSS.escape(agentId)}"].react-flow__node`)

        if (!node) {
            return {
                leftPos: window.innerWidth - BUBBLE_DISTANCE_FROM_RIGHT_EDGE - BUBBLE_WIDTH,
                topPos: BUBBLE_STACK_OFFSET_TOP,
            }
        }

        const rect = node.getBoundingClientRect()

        const left = rect.right - 30 + BUBBLE_OFFSET_X
        const topPos = rect.top - BUBBLE_HEIGHT / 2 - BUBBLE_OFFSET_Y

        return {
            leftPos: Math.min(left, window.innerWidth - BUBBLE_WIDTH - BUBBLE_DISTANCE_FROM_RIGHT_EDGE),
            topPos: Math.max(topPos, 20),
        }
    }

    // Filter conversations to only those that have text and at least one agent
    const renderableConversations = [...currentConversations]
        .filter((conversation) => conversation.text?.trim() && conversation.agents.size > 0)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, MAX_BUBBLES)

    return (
        <OverlayContainer>
            {renderableConversations?.map((conversation) => {
                const text = conversation.text?.trim()
                const id = `thought-bubble-${conversation.id}`
                const {leftPos, topPos} = getBubblePositionForNode(conversation)

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

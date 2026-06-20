import Box from "@mui/material/Box"
import {isEmpty} from "lodash-es"
import {FC, useMemo} from "react"
import ReactMarkdown from "react-markdown"

import {ConversationTurn, MessageRole} from "./ConversationTurn"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {AccordionLite} from "../../Common/AccordionLite"
import {cleanUpAgentName, removeTrailingUuid} from "../Common/Utils"

interface ThinkingProps {
    readonly id: string
    readonly turns: ConversationTurn[]
    readonly useNativeNames: boolean
}

/**
 * Set of message types that should be included in the "thinking" section.
 */
const THINKING_MESSAGE_TYPES = new Set<ChatMessageType>([
    ChatMessageType.AI,
    ChatMessageType.AGENT,
    ChatMessageType.AGENT_PROGRESS,
    ChatMessageType.SYSTEM,
])

const DEFAULT_AGENT_NAME = "agent"

const formatTurn = (turn: ConversationTurn, useNativeNames: boolean) => {
    const agentName = turn.agentName ?? DEFAULT_AGENT_NAME
    const displayName = useNativeNames ? agentName : cleanUpAgentName(removeTrailingUuid(agentName))

    const headerLine = `**${displayName}**: ${turn.text || ""}`
    const structureLine = turn.structure == null ? "" : `\n\`${JSON.stringify(turn.structure, null, 2)}\``

    return `${headerLine}${structureLine}`
}

/**
 * Component to render the "thinking" section of the chat, which includes all messages from the agent that are
 * of a type included in THINKING_MESSAGE_TYPES.
 */
export const Thinking: FC<ThinkingProps> = ({id, turns, useNativeNames}) => {
    const thinkingText: string = useMemo(() => {
        // Find start of latest interaction (most recent user prompt)
        const lastUserTurnIndex = turns.map((t) => t.role).lastIndexOf(MessageRole.User)

        // Only include thinking emitted after latest user prompt
        // Deliberately allow -1 result to fall through and include all thinking messages if there are no user turns
        return turns
            .slice(lastUserTurnIndex + 1)
            .filter((turn) => THINKING_MESSAGE_TYPES.has(turn.messageType))
            .filter((turn) => turn.text?.trim().length > 0 || !isEmpty(turn.structure))
            .map((turn) => formatTurn(turn, useNativeNames))
            .join("\n\n")
    }, [turns, useNativeNames])

    return (
        thinkingText.length > 0 && (
            <AccordionLite
                id={`${id}-thinking`}
                items={
                    <Box
                        sx={{
                            marginLeft: "0.5rem",
                            fontSize: "smaller",
                            fontStyle: "italic",
                        }}
                    >
                        <ReactMarkdown>{thinkingText}</ReactMarkdown>
                    </Box>
                }
                contentSx={{
                    color: "text.secondary",
                    minWidth: 0,
                    padding: 0,
                    textTransform: "none",
                }}
                title="Show Thinking"
            />
        )
    )
}

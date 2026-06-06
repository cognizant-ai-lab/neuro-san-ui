import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Collapse from "@mui/material/Collapse"
import {FC, useMemo, useState} from "react"
import ReactMarkdown from "react-markdown"

import {ConversationTurn, MessageRole} from "./ConversationTurn"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"

interface ThinkingProps {
    readonly id: string
    readonly turns: ConversationTurn[]
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

const formatTurn = (turn: ConversationTurn) => {
    const headerLine = `**${turn.agentName ?? "Agent"}**: ${turn.text}`
    const structureLine = turn.structure != null ? `\n\`${JSON.stringify(turn.structure)}\`` : ""

    return `${headerLine}${structureLine}`
}

/**
 * Component to render the "thinking" section of the chat, which includes all messages from the agent that are
 * of a type included in THINKING_MESSAGE_TYPES.
 */
export const Thinking: FC<ThinkingProps> = ({id, turns}) => {
    const [showThinkingExpanded, setShowThinkingExpanded] = useState<boolean>(false)

    const thinkingText: string = useMemo(() => {
        // Find start of latest interaction (most recent user prompt)
        const lastUserTurnIndex = turns.map((t) => t.role).lastIndexOf(MessageRole.User)

        // Only include thinking emitted after latest user prompt
        // Deliberately allow -1 result to fall through and include all thinking messages if there are no user turns
        return turns
            .slice(lastUserTurnIndex + 1)
            .filter((turn) => turn.messageType && THINKING_MESSAGE_TYPES.has(turn.messageType))
            .filter((turn) => turn.text?.trim().length > 0)
            .map((turn) => formatTurn(turn))
            .join("\n\n")
    }, [turns])

    return (
        thinkingText.length > 0 && (
            <Box
                id={`${id}-thinking`}
                sx={{marginBottom: "1rem"}}
            >
                <Button
                    onClick={() => setShowThinkingExpanded((prev) => !prev)}
                    startIcon={
                        <ExpandMoreIcon
                            sx={{
                                fontSize: "1rem",
                                transform: showThinkingExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 150ms ease",
                            }}
                        />
                    }
                    aria-expanded={showThinkingExpanded}
                    aria-controls={`${id}-thinking-content`}
                    sx={{
                        "&:hover": {backgroundColor: "transparent", textDecoration: "underline"},
                        color: "text.secondary",
                        fontSize: "smaller",
                        minWidth: 0,
                        padding: 0,
                        textTransform: "none",
                    }}
                >
                    Show thinking
                </Button>

                <Collapse
                    in={showThinkingExpanded}
                    id={`${id}-thinking-content`}
                    timeout="auto"
                    unmountOnExit={false}
                >
                    <Box
                        sx={{
                            marginLeft: "0.5rem",
                            marginTop: "0.5rem",
                            fontSize: "smaller",
                            fontStyle: "italic",
                        }}
                    >
                        <ReactMarkdown>{thinkingText}</ReactMarkdown>
                    </Box>
                </Collapse>
            </Box>
        )
    )
}

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

/**
 * Component to render the "thinking" section of the chat, which includes all messages from the agent that are
 * of a type included in THINKING_MESSAGE_TYPES.
 */
export const Thinking: FC<ThinkingProps> = ({id, turns}) => {
    const [showThinkingExpanded, setShowThinkingExpanded] = useState<boolean>(false)

    const thinkingNodes: string = useMemo(() => {
        // Find start of latest interaction (most recent user prompt)
        const lastUserTurnIndex = turns.map((t) => t.role).lastIndexOf(MessageRole.User)

        // If no user turn exists yet, show nothing
        if (lastUserTurnIndex < 0) return ""

        // Only include thinking emitted after latest user prompt
        return turns
            .slice(lastUserTurnIndex + 1)
            .filter((turn) => turn.messageType && THINKING_MESSAGE_TYPES.has(turn.messageType))
            .map((turn) => `**${turn.agentName ?? "Agent"}**: ${turn.text ?? ""}`)
            .join("\n\n")
    }, [turns])

    return (
        thinkingNodes.length > 0 && (
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
                        <ReactMarkdown>{thinkingNodes}</ReactMarkdown>
                    </Box>
                </Collapse>
            </Box>
        )
    )
}

import Box from "@mui/material/Box"
import {useTheme} from "@mui/material/styles"
import {FC, ReactNode, Ref, useMemo} from "react"
import ReactMarkdown from "react-markdown"

import {ConversationTurn, MessageRole} from "./ConversationTurn"
import {FormattedMarkdown} from "./FormattedMarkdown"
import {HLJS_THEMES} from "./SyntaxHighlighterThemes"
import {MUIAlert} from "../../Common/MUIAlert"

interface ConversationProps {
    readonly id: string
    readonly finalAnswerRef?: Ref<HTMLDivElement>
    readonly showThinking: boolean
    readonly shouldWrapOutput: boolean
    readonly turns: ConversationTurn[]
}

const {atelierDuneDark, a11yLight} = HLJS_THEMES

export const Conversation: FC<ConversationProps> = ({finalAnswerRef, id, shouldWrapOutput, showThinking, turns}) => {
    // MUI theme
    const theme = useTheme()
    const darkMode = theme.palette.mode === "dark"

    /**
     * Render the list of conversation turns.
     */
    const nodesList: ReactNode[] = useMemo(
        () =>
            turns.flatMap((turn): ReactNode[] => {
                switch (turn.role) {
                    case MessageRole.User:
                        return [
                            <Box
                                id={turn.id}
                                key={turn.id}
                                style={{
                                    backgroundColor: theme.palette.background.paper,
                                    borderRadius: "1rem",
                                    marginBottom: "1rem",
                                    marginLeft: "auto",
                                    overflowWrap: "anywhere",
                                    paddingLeft: "1rem",
                                    paddingRight: "1rem",
                                    paddingTop: "0.5rem",
                                    paddingBottom: "0.5rem",
                                    whiteSpace: "pre-wrap",
                                    width: "60%",
                                }}
                            >
                                {turn.text}
                            </Box>,
                        ]
                    case MessageRole.Agent:
                        return showThinking || turn.alwaysShow
                            ? [
                                  <Box
                                      id={turn.id}
                                      key={turn.id}
                                      ref={finalAnswerRef}
                                      sx={{marginBottom: "1rem"}}
                                  >
                                      <ReactMarkdown>{turn.text}</ReactMarkdown>
                                  </Box>,
                              ]
                            : []
                    case MessageRole.AgentHeader:
                        return []
                    case MessageRole.LegacyAgent:
                        return [turn.text]
                    case MessageRole.FinalAnswer:
                        return [
                            <Box
                                id={turn.id}
                                key={turn.id}
                                ref={finalAnswerRef}
                                style={{
                                    marginBottom: "1rem",
                                }}
                            >
                                <ReactMarkdown>{turn.text}</ReactMarkdown>
                            </Box>,
                        ]
                    case MessageRole.Warning:
                        return [
                            <MUIAlert
                                id={`warning-${turn.id}-alert`}
                                key={turn.id}
                                severity="warning"
                            >
                                {turn.text}
                            </MUIAlert>,
                        ]
                    case MessageRole.Error:
                        return [
                            <MUIAlert
                                id={`error-${turn.id}-alert`}
                                key={turn.id}
                                severity="error"
                            >
                                {turn.text}
                            </MUIAlert>,
                        ]
                    /* istanbul ignore next -- impossible to trigger this without subverting tsc */
                    default: {
                        // Exhaustiveness check. This way tsc will complain if a new MessageRole is added but
                        // not handled here.
                        const _exhaustive: never = turn.role
                        throw new Error(`Unhandled message role: ${_exhaustive}`)
                    }
                }
            }),
        [finalAnswerRef, showThinking, theme.palette.background.paper, turns]
    )

    return (
        <FormattedMarkdown
            id={`${id}-conversation`}
            nodesList={nodesList}
            style={darkMode ? atelierDuneDark : a11yLight}
            wrapLongLines={shouldWrapOutput}
        />
    )
}

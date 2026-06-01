import {alpha, useTheme} from "@mui/material/styles"
import {jsonrepair} from "jsonrepair"
import {FC, ReactNode, Ref, useMemo} from "react"
import ReactMarkdown from "react-markdown"
import SyntaxHighlighter from "react-syntax-highlighter"

import {AGENT_IMAGE} from "./Const"
import {ConversationTurn, MessageRole} from "./ConversationTurn"
import {FormattedMarkdown} from "./FormattedMarkdown"
import {HLJS_THEMES} from "./SyntaxHighlighterThemes"
import {UserQueryDisplay} from "./UserQueryDisplay"
import {MUIAccordion} from "../../Common/MUIAccordion"
import {MUIAlert} from "../../Common/MUIAlert"

interface ConversationProps {
    readonly id: string
    readonly currentUser: string
    readonly finalAnswerRef?: Ref<HTMLDivElement>
    readonly userImage?: string
    readonly showThinking: boolean
    readonly shouldWrapOutput: boolean
    readonly turns: ConversationTurn[]
}

const {atelierDuneDark, a11yLight} = HLJS_THEMES

/**
 * Renders a "turn" from the conversation
 * @param darkMode Whether the current theme is in dark mode. Used to determine syntax highlighter theme.
 * @param shadowColor The color to use for shadows on the final answer accordion.
 * @param shouldWrapOutput Whether to wrap long lines in the output. Passed down to the syntax highlighter component.
 * @param turn The turn to render. @see ConversationTurn type for more info
 * @returns A React component representing the "turn"
 */
const renderTurn = (
    darkMode: boolean,
    shadowColor: string,
    shouldWrapOutput: boolean,
    turn: ConversationTurn
): ReactNode => {
    // extract the parts of the line
    let repairedJson: string

    try {
        // Attempt to parse as JSON

        // First, repair it. Also replace "escaped newlines" with actual newlines for better display.
        repairedJson = jsonrepair(turn.text)

        // Now try to parse it. We don't care about the result, only if it throws on parsing.
        JSON.parse(repairedJson)

        repairedJson = repairedJson.replaceAll(String.raw`\n`, "\n").replaceAll(String.raw`\"`, "'")
    } catch {
        // Not valid JSON
        repairedJson = null
    }

    const isFinalAnswer = turn.role === MessageRole.FinalAnswer
    const summary = isFinalAnswer ? "Final Answer" : (turn.agentName ?? "Agent")

    return (
        <MUIAccordion
            key={turn.id}
            id={`${turn.id}-panel`}
            defaultExpandedPanelKey={isFinalAnswer ? 1 : null}
            items={[
                {
                    title: summary,
                    content: (
                        <div id={turn.id}>
                            {/* If we managed to parse it as JSON, pretty print it */}
                            {repairedJson ? (
                                <SyntaxHighlighter
                                    id="syntax-highlighter"
                                    language="json"
                                    style={darkMode ? atelierDuneDark : a11yLight}
                                    showLineNumbers={false}
                                    wrapLongLines={shouldWrapOutput}
                                >
                                    {repairedJson}
                                </SyntaxHighlighter>
                            ) : (
                                <ReactMarkdown>{turn.text}</ReactMarkdown>
                            )}
                        </div>
                    ),
                },
            ]}
            sx={{
                fontSize: "large",
                marginBottom: "1rem",
                boxShadow: isFinalAnswer
                    ? `0 6px 16px 0 ${alpha(shadowColor, 0.08)}, 0 3px 6px -4px ${alpha(shadowColor, 0.12)}, 
                                    0 9px 28px 8px ${alpha(shadowColor, 0.05)}`
                    : "none",
            }}
        />
    )
}

/**
 */
export const Conversation: FC<ConversationProps> = ({
    currentUser,
    finalAnswerRef,
    id,
    shouldWrapOutput,
    showThinking,
    turns,
    userImage,
}) => {
    // MUI theme
    const theme = useTheme()
    const darkMode = theme.palette.mode === "dark"
    const shadowColor = darkMode ? theme.palette.common.white : theme.palette.common.black

    /**
     * Render the list of conversation turns.
     */
    const nodesList: ReactNode[] = useMemo(
        () =>
            turns.flatMap((turn): ReactNode[] => {
                switch (turn.role) {
                    case MessageRole.User:
                        return [
                            <UserQueryDisplay
                                key={turn.id}
                                userQuery={turn.text}
                                title={currentUser}
                                userImage={userImage}
                            />,
                        ]
                    case MessageRole.Agent:
                        return showThinking || turn.alwaysShow
                            ? [renderTurn(darkMode, shadowColor, shouldWrapOutput, turn)]
                            : []
                    case MessageRole.AgentHeader:
                        return [
                            <UserQueryDisplay
                                key={turn.id}
                                title={turn.agentName ?? "Agent"}
                                userImage={AGENT_IMAGE}
                                userQuery={turn.agentDisplayName}
                            />,
                        ]
                    case MessageRole.LegacyAgent:
                        return [turn.text]
                    case MessageRole.FinalAnswer:
                        return [
                            <div
                                id="final-answer-div"
                                key={turn.id}
                                ref={finalAnswerRef}
                                style={{marginBottom: "1rem"}}
                            >
                                {renderTurn(darkMode, shadowColor, shouldWrapOutput, turn)}
                            </div>,
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
        [currentUser, darkMode, finalAnswerRef, shadowColor, shouldWrapOutput, showThinking, turns, userImage]
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

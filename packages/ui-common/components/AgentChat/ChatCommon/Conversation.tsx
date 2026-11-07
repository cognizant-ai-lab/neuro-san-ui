import Box from "@mui/material/Box"
import {keyframes, styled, SxProps, Theme, useTheme} from "@mui/material/styles"
import {CSSProperties, FC, ReactNode, useMemo} from "react"

import {ConversationTurn, MessageRole} from "./ConversationTurn"
import {FormattedMarkdown} from "./FormattedMarkdown"
import {HLJS_THEMES} from "./SyntaxHighlighterThemes"
import {
    getSheen,
    gradientBorder,
    SHEEN_FONT_MONO,
    SHEEN_RADIUS,
    SHEEN_RADIUS_SURFACE,
    sheenConic,
    sheenGradient,
} from "../../../Theme/sheen"
import {MUIAlert} from "../../Common/MUIAlert"

interface ConversationProps {
    readonly id: string
    readonly includeAgentMessages?: boolean
    // Whether the latest response is still streaming in (shows a caret at the end of it)
    readonly isStreaming?: boolean
    readonly shouldWrapOutput: boolean
    readonly turns: ConversationTurn[]
}

// Atom One is a cool blue/purple palette in both variants, so it sits well on the blue-black / lavender surfaces
const {atomOneDark, atomOneLight} = HLJS_THEMES

// Height of the slim header bar painted across the top of code blocks
const CODE_HEADER_HEIGHT = 28

// User bubbles are fully rounded except for a tighter "tail" corner pointing back at the sender
const USER_BUBBLE_TAIL_RADIUS = 6
export const USER_BUBBLE_RADIUS = [
    SHEEN_RADIUS_SURFACE,
    SHEEN_RADIUS_SURFACE,
    USER_BUBBLE_TAIL_RADIUS,
    SHEEN_RADIUS_SURFACE,
]
    .map((r) => `${r}px`)
    .join(" ")

// Blinking for the streaming caret
const CARET_BLINK = keyframes`
    0%, 45% { opacity: 1; }
    55%, 100% { opacity: 0.15; }
`

/**
 * Styled component for a user turn bubble: primary tint washed with the iridescent gradient, a gradient hairline and a
 * tighter tail corner.
 */
const UserTurnBubble = styled(Box)(({theme}) => {
    const sheen = getSheen(theme)
    const border = gradientBorder(theme, SHEEN_RADIUS_SURFACE, 1, 0.55)
    return {
        ...border,
        backgroundColor: sheen.tint,
        backgroundImage: `linear-gradient(180deg, ${sheen.highlight}, transparent 60%)`,
        border: "1px solid transparent",
        borderRadius: USER_BUBBLE_RADIUS,
        boxShadow: `0 10px 30px -18px ${sheen.glow}`,
        color: (theme.vars ?? theme).palette.text.primary,
        isolation: "isolate",
        marginBottom: "1rem",
        marginLeft: "auto",
        maxWidth: "75%",
        overflowWrap: "anywhere",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        paddingTop: "0.6rem",
        paddingBottom: "0.6rem",
        whiteSpace: "pre-wrap",
        width: "fit-content",
        minWidth: "30%",
        "&::before": {...border["&::before"], borderRadius: USER_BUBBLE_RADIUS},
        // Low-alpha wash of the signature gradient under the text
        "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            zIndex: -1,
            borderRadius: USER_BUBBLE_RADIUS,
            background: sheenGradient(theme),
            opacity: 0.14,
            pointerEvents: "none",
        },
    }
})

/**
 * Styles for the conversation container: assistant Markdown blocks become glass cards marked with a small spinning
 * iridescent orb, and code blocks get a slim header bar with their language.
 */
const getConversationSx = (theme: Theme): SxProps<Theme> => {
    const sheen = getSheen(theme)
    return {
        // Entrance and layout animations are driven by motion (see FormattedMarkdown)
        "& > .formatted-markdown-block": {
            backgroundColor: sheen.glassBg,
            backgroundImage: `linear-gradient(180deg, ${sheen.highlight}, transparent 38%)`,
            border: `1px solid ${sheen.glassBorder}`,
            borderRadius: `${SHEEN_RADIUS_SURFACE}px`,
            boxShadow: `inset 0 1px 0 ${sheen.highlight}, 0 8px 28px -18px rgba(0, 0, 0, 0.45)`,
            marginBottom: "1rem",
            overflowWrap: "anywhere",
            padding: "0.75rem 1.1rem 0.75rem 2.6rem",
            position: "relative",
            // Assistant "orb": spinning conic gradient with a specular highlight and a soft glow
            "&::before": {
                content: '""',
                position: "absolute",
                left: 14,
                top: 18,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: [
                    "radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.85), transparent 45%)",
                    sheenConic(theme),
                ].join(", "),
                boxShadow: `0 0 12px 1px ${sheen.glow}`,
                animation: "sheenSpin 6s linear infinite",
                pointerEvents: "none",
            },
            "& > :first-of-type": {marginTop: 0},
            "& > :last-child": {marginBottom: 0},
        },
        // While a response streams in, a soft gradient caret glows at the end of the text. Inline at the end of the
        // last paragraph/list item, or on its own line after a code block.
        "& > .formatted-markdown-block.is-streaming": {
            "& > :last-child:not(pre, div, ul, ol, table)::after, & > :is(ul, ol):last-child > li:last-child::after": {
                animation: `${CARET_BLINK} 1s ease-in-out infinite`,
                backgroundImage: sheenGradient(theme, 180),
                borderRadius: "2px",
                boxShadow: `0 0 10px ${sheen.glow}`,
                content: '""',
                display: "inline-block",
                height: "1.05em",
                marginLeft: "3px",
                transform: "translateY(0.18em)",
                width: "0.5em",
            },
            "& > :is(pre, div, table):last-child::after": {
                animation: `${CARET_BLINK} 1s ease-in-out infinite`,
                backgroundImage: sheenGradient(theme, 180),
                borderRadius: "2px",
                boxShadow: `0 0 10px ${sheen.glow}`,
                content: '""',
                display: "block",
                height: "1.05em",
                marginTop: "0.4em",
                width: "0.5em",
            },
        },
        "& code": {fontFamily: SHEEN_FONT_MONO, fontSize: "0.9em"},
        "& :not(pre) > code:not([class])": {
            backgroundColor: sheen.tint,
            borderRadius: "6px",
            padding: "0.1em 0.35em",
        },
        // Language label in the code block header bar
        "& [data-language]::before": {
            content: "attr(data-language)",
            position: "absolute",
            top: 0,
            left: "1em",
            height: CODE_HEADER_HEIGHT,
            display: "flex",
            alignItems: "center",
            color: (theme.vars ?? theme).palette.text.secondary,
            fontFamily: SHEEN_FONT_MONO,
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
        },
    }
}

/**
 * Format the content of a conversation turn for display. Pretty-print JSON.
 * @param turn The conversation turn to format.
 * @returns The formatted content of the turn with JSON fences as appropriate.
 */
const formatTurnContent = (turn: ConversationTurn): string => {
    if (turn.text) {
        return turn.text
    }

    if (turn.structure != null) {
        return `\`\`\`json\n${JSON.stringify(turn.structure, null, 2)}\n\`\`\``
    } else {
        return ""
    }
}

/**
 * Component to render a conversation between the user and the agent.
 */
export const Conversation: FC<ConversationProps> = ({
    id,
    includeAgentMessages = false,
    isStreaming = false,
    shouldWrapOutput,
    turns,
}) => {
    // MUI theme
    const theme = useTheme()
    const darkMode = theme.palette.mode === "dark"

    // Syntax highlighter theme for the current mode, with code blocks rounded and outlined to match glass surfaces
    const syntaxStyle = useMemo(() => {
        const base = darkMode ? atomOneDark : atomOneLight
        const sheen = getSheen(theme)
        // Slim header bar (tint band + hairline) layered over the highlighter's own background color
        const headerBar =
            `linear-gradient(180deg, ${sheen.tint} 0 ${CODE_HEADER_HEIGHT}px, ${sheen.glassBorder} ` +
            `${CODE_HEADER_HEIGHT}px ${CODE_HEADER_HEIGHT + 1}px, transparent ${CODE_HEADER_HEIGHT + 1}px)`
        // Split the theme's background shorthand into longhands so the header bar can be layered over its color
        const {background: themeBackground, ...hljsBase} = base["hljs"]
        const hljsBlock: CSSProperties = {
            ...hljsBase,
            backgroundColor: String(themeBackground),
            backgroundImage: headerBar,
            border: `1px solid ${sheen.glassBorder}`,
            borderRadius: SHEEN_RADIUS,
            boxShadow: `inset 0 1px 0 ${sheen.highlight}, 0 10px 30px -18px rgba(0, 0, 0, 0.5)`,
            fontFamily: SHEEN_FONT_MONO,
            padding: `${CODE_HEADER_HEIGHT + 10}px 1em 0.75em`,
            position: "relative",
        }
        return {...base, hljs: hljsBlock}
    }, [darkMode, theme])

    const conversationSx = useMemo(() => getConversationSx(theme), [theme])

    /**
     * Render the list of conversation turns.
     */
    const nodesList: ReactNode[] = useMemo(
        () =>
            turns.flatMap((turn): ReactNode[] => {
                switch (turn.role) {
                    case MessageRole.User:
                        return [
                            <UserTurnBubble
                                id={turn.id}
                                key={turn.id}
                            >
                                {turn.text}
                            </UserTurnBubble>,
                        ]
                    case MessageRole.Agent:
                        return includeAgentMessages ? [formatTurnContent(turn)] : []
                    case MessageRole.FinalAnswer:
                        return [formatTurnContent(turn)]
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
        [includeAgentMessages, turns]
    )

    return (
        <FormattedMarkdown
            id={`${id}-conversation`}
            isStreaming={isStreaming}
            nodesList={nodesList}
            style={syntaxStyle}
            sx={conversationSx}
            wrapLongLines={shouldWrapOutput}
        />
    )
}

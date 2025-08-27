/**
 * See main function description.
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import ClearIcon from "@mui/icons-material/Clear"
import CloseIcon from "@mui/icons-material/Close"
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom"
import WrapTextIcon from "@mui/icons-material/WrapText"
import {Box, Input} from "@mui/material"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {jsonrepair} from "jsonrepair"
import {
    cloneElement,
    CSSProperties,
    Dispatch,
    forwardRef,
    isValidElement,
    ReactElement,
    ReactNode,
    SetStateAction,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react"
import ReactMarkdown from "react-markdown"
import SyntaxHighlighter from "react-syntax-highlighter"

import {ControlButtons} from "./ControlButtons"
import {FormattedMarkdown} from "./FormattedMarkdown"
import {AGENT_GREETINGS} from "./Greetings"
import {SendButton} from "./SendButton"
import {HLJS_THEMES} from "./SyntaxHighlighterThemes"
import {CombinedAgentType, isLegacyAgentType} from "./Types"
import {UserQueryDisplay} from "./UserQueryDisplay"
import {chatMessageFromChunk, checkError, cleanUpAgentName} from "./Utils"
import {MicrophoneButton} from "./VoiceChat/MicrophoneButton"
import {checkSpeechSupport, SpeechRecognition, useVoiceRecognition, VoiceChatState} from "./VoiceChat/VoiceChat"
import {getAgentFunction, getConnectivity, sendChatQuery} from "../../controller/agent/Agent"
import {sendLlmRequest} from "../../controller/llm/LlmChat"
import {
    ChatContext,
    ChatMessage,
    ChatMessageType,
    ConnectivityInfo,
    ConnectivityResponse,
    FunctionResponse,
} from "../../../../generated/neuro-san/NeuroSanClient"
import {usePreferences} from "../../state/Preferences"
import {hashString, hasOnlyWhitespace} from "../../utils/text"
import {LlmChatOptionsButton} from "../Common/LlmChatOptionsButton"
import {MUIAccordion, MUIAccordionProps} from "../Common/MUIAccordion"
import {MUIAlert} from "../Common/MUIAlert"
import {NotificationType, sendNotification} from "../Common/notification"

export interface ChatCommonProps {
    /**
     * HTML id to use for the outer component
     */
    readonly id: string

    /**
     * The current user name of the logged in user. Used for fetching things from APIs mainly
     */
    readonly currentUser: string

    /**
     * Path to image for user avatar
     */
    readonly userImage: string

    /**
     * Function to set the state of the component to indicate whether we are awaiting a response from the LLM
     */
    readonly setIsAwaitingLlm: Dispatch<SetStateAction<boolean>>

    /**
     * Whether we are currently awaiting a response from the LLM
     */
    readonly isAwaitingLlm: boolean

    /**
     * The agent to send the request to.
     */
    readonly targetAgent: string

    /**
     * Special endpoint for legacy agents since they do not have a single unified endpoint like Neuro-san agents.
     */
    readonly legacyAgentEndpoint?: string

    /**
     * Optional extra callback for containers to do extra things with the chunks as they are received. Parent
     * returns true if it believes the chunk indicates that the interaction with the agent was successful and no
     * retries are necessary.
     */
    readonly onChunkReceived?: (chunk: string) => boolean

    /**
     * Will be called when the streaming is started, before any chunks are received.
     */
    readonly onStreamingStarted?: () => void

    /**
     * Will be called when the streaming is complete, whatever the reason for termination (normal or error)
     */
    readonly onStreamingComplete?: () => void

    /**
     * Optional callback to modify the query before sending it to the server. This is useful for adding extra
     * information to the query before sending it or totally modifying the user query before sending.
     */
    readonly onSend?: (query: string) => string

    /**
     * Lifted state for parent to manage the previous response from the agent.
     */
    readonly setPreviousResponse?: (agent: CombinedAgentType, response: string) => void

    /**
     * Optional placeholders for input to agents.
     */
    readonly agentPlaceholders?: Partial<Record<CombinedAgentType, string>>

    /**
     * Whether to clear the chat window and history when the user starts chatting with a new agent or network.
     * Defaults to not clearing the chat.
     */
    readonly clearChatOnNewAgent?: boolean

    /**
     * Extra parameters to send to the server to be forwarded to the agent or used by the server.
     * @note This is only used for legacy agents to aid in UI consolidation, only Neuro-san agents.
     */
    readonly extraParams?: Record<string, unknown>

    /**
     * Background color for the chat window. Helps when there are multiple chats on a single page.
     */
    readonly backgroundColor?: string

    /**
     * If present, the chat window will have a title bar with this title.
     */
    readonly title?: string

    /**
     * If present, the chat window will have a close button that will call this function when clicked.
     */
    readonly onClose?: () => void

    /**
     * The neuro-san server URL
     */
    readonly neuroSanURL?: string
}

// Define fancy EMPTY constant to avoid linter error about using object literals as default props
const EMPTY: Partial<Record<CombinedAgentType, string>> = {}

// Avatar to use for agents in chat
const AGENT_IMAGE = "/agent.svg"

// How many times to retry the entire agent interaction process. Some networks have a well-defined success condition.
// For others it's just "whenever the stream is done".
const MAX_AGENT_RETRIES = 3

// Type for forward ref to expose the handleStop function
export type ChatCommonHandle = {
    handleStop: () => void
}

/**
 * Common chat component for agent chat. This component is used by all agent chat components to provide a consistent
 * experience for users when chatting with agents. It handles user input as well as displaying and nicely formatting
 * agent responses. Customization for inputs and outputs is provided via event handlers-like props.
 */
export const ChatCommon = forwardRef<ChatCommonHandle, ChatCommonProps>((props, ref) => {
    const slyData = useRef<Record<string, unknown>>({})
    // Voice state for microphone and speech recognition
    const [voiceState, setVoiceState] = useState<VoiceChatState>({
        isListening: false,
        currentTranscript: "",
        isSpeaking: false,
        finalTranscript: "",
    })
    const {
        id,
        currentUser,
        userImage,
        setIsAwaitingLlm,
        isAwaitingLlm,
        onChunkReceived,
        onStreamingStarted,
        onStreamingComplete,
        onSend,
        setPreviousResponse,
        targetAgent,
        legacyAgentEndpoint,
        agentPlaceholders = EMPTY,
        clearChatOnNewAgent = false,
        extraParams,
        backgroundColor,
        title,
        onClose,
        neuroSanURL,
    } = props

    // Expose the handleStop method to parent components via ref for external control (e.g., to cancel chat requests)
    useImperativeHandle(ref, () => ({
        handleStop,
    }))

    // User LLM chat input
    const [chatInput, setChatInput] = useState<string>("")

    // Previous user query (for "regenerate" feature)
    const [previousUserQuery, setPreviousUserQuery] = useState<string>("")

    // Chat output window contents
    const [chatOutput, setChatOutput] = useState<ReactNode[]>([])

    // To accumulate current response, which will be different than the contents of the output window if there is a
    // chat session
    const currentResponse = useRef<string>("")

    // Ref for output text area, so we can auto scroll it
    const chatOutputRef = useRef(null)

    // Ref for user input text area, so we can handle shift-enter
    const chatInputRef = useRef(null)

    // Controller for cancelling fetch request
    const controller = useRef<AbortController>(null)

    // For tracking if we're autoscrolling. A button allows the user to enable or disable autoscrolling.
    const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true)

    // ref for same
    const autoScrollEnabledRef = useRef<boolean>(autoScrollEnabled)

    // Whether to wrap output text
    const [shouldWrapOutput, setShouldWrapOutput] = useState<boolean>(true)

    // Keeps a copy of the last AI message so we can highlight it as "final answer"
    const lastAIMessage = useRef<string>("")

    // Ref for the final answer key, so we can highlight the accordion
    const finalAnswerKey = useRef<string>("")

    // Use useRef here since we don't want changes in the chat history to trigger a re-render
    const chatHistory = useRef<BaseMessage[]>([])

    /* Use useRef here since we don't want changes in the chat context to trigger a re-render
    Note on ChatContext vs ChatHistory:
    "Legacy" (not Neuro-san) agents use ChatHistory, which is a collection of messages of various types, Human, AI,
    System etc. It mimics the langchain field of the same name.
    Neuro-san agents deal in ChatContext, which is a more complex collection of chat histories, since more agents
    are involved.
    Both fields fulfill the same purpose: to maintain conversation state across multiple messages.
    */
    const chatContext = useRef<ChatContext>(null)
    const finalAnswerRef = useRef<HTMLDivElement>(null)
    const [showThinking, setShowThinking] = useState<boolean>(false)
    const [isMicOn, setIsMicOn] = useState<boolean>(false)
    const [isProcessingSpeech, setIsProcessingSpeech] = useState<boolean>(false)

    // Check speech support once at component mount
    const speechSupported = useMemo(() => checkSpeechSupport(), [])

    const voiceRefs = useRef<{
        recognition: SpeechRecognition | null
    }>({
        recognition: null,
    })

    // Define styles based on user options (wrap setting)
    const divStyle: CSSProperties = shouldWrapOutput
        ? {
              whiteSpace: "normal",
              overflow: "visible",
              textOverflow: "clip",
              overflowX: "visible",
          }
        : {
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              overflowX: "auto",
          }

    // Keeps track of whether the agent completed its task
    const succeeded = useRef<boolean>(false)

    const {darkMode} = usePreferences()

    // Temporary styling for implementation of dark mode
    const darkModeStyling = {
        backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-white)",
        color: darkMode ? "var(--bs-white)" : "var(--bs-primary)",
    }

    const {atelierDuneDark, a11yLight} = HLJS_THEMES

    // Hide/show existing accordions based on showThinking state
    useEffect(() => {
        setChatOutput((currentOutput) =>
            currentOutput.map((item) => {
                if (isValidElement(item) && item.type === MUIAccordion) {
                    const itemAsAccordion = item as ReactElement<MUIAccordionProps>
                    return cloneElement(itemAsAccordion, {
                        sx: {
                            ...item.props.sx,
                            display: showThinking || item.key === finalAnswerKey?.current ? "block" : "none",
                            ...darkModeStyling,
                        },
                    })
                }
                return item
            })
        )
    }, [showThinking, darkMode])

    // Sync ref with state variable for use within timer etc.
    useEffect(() => {
        autoScrollEnabledRef.current = autoScrollEnabled
    }, [autoScrollEnabled])

    useEffect(() => {
        // Delay for a second before focusing on the input area; gets around ChatBot stealing focus.
        setTimeout(() => chatInputRef?.current?.focus(), 1000)
    }, [])

    // Auto scroll chat output window when new content is added
    useEffect(() => {
        // Scroll the final answer into view
        if (finalAnswerRef.current && !isAwaitingLlm) {
            const offset = 50
            chatOutputRef.current.scrollTop = finalAnswerRef.current.offsetTop - offset
            return
        }

        if (autoScrollEnabledRef.current && chatOutputRef?.current) {
            chatOutputRef.current.scrollTop = chatOutputRef.current.scrollHeight
        }
    }, [chatOutput])

    useEffect(() => {
        // Clear chat output on change of neuro-san URL
        // TODO: We want to revise this in the future to not need a useEffect
        setChatOutput([])
        currentResponse.current = ""
        setShowThinking(false)
    }, [neuroSanURL])

    /**
     * Process a log line from the agent and format it nicely using the syntax highlighter and Accordion components.
     * By the time we get to here, it's assumed things like errors and termination conditions have already been handled.
     *
     * @param logLine The log line to process
     * @param messageType The type of the message (AI, LEGACY_LOGS etc.). Used for displaying certain message types
     * differently
     * @param isFinalAnswer If true, the log line is the final answer from the agent. This will be highlighted in some
     * way to draw the user's attention to it.
     * @param summary Used as the "title" for the accordion block. Something like an agent name or "Final Answer"
     * @returns A React component representing the log line (agent message)
     */
    const processLogLine = (
        logLine: string,
        summary: string,
        messageType: ChatMessageType,
        isFinalAnswer?: boolean
    ): ReactNode => {
        // extract the parts of the line
        let repairedJson: string

        try {
            // Attempt to parse as JSON

            // First, repair it. Also replace "escaped newlines" with actual newlines for better display.
            repairedJson = jsonrepair(logLine)

            // Now try to parse it. We don't care about the result, only if it throws on parsing.
            JSON.parse(repairedJson)

            repairedJson = repairedJson.replace(/\\n/gu, "\n").replace(/\\"/gu, "'")
        } catch {
            // Not valid JSON
            repairedJson = null
        }

        const hashedSummary = hashString(summary)
        const isAIMessage = messageType === ChatMessageType.AI

        if (isAIMessage && !isFinalAnswer) {
            lastAIMessage.current = logLine
        }

        if (isFinalAnswer) {
            // Save key of final answer for highlighting
            finalAnswerKey.current = hashedSummary
        }

        return (
            <MUIAccordion
                key={hashedSummary}
                id={`${hashedSummary}-panel`}
                defaultExpandedPanelKey={isFinalAnswer ? 1 : null}
                items={[
                    {
                        title: summary,
                        content: (
                            <div id={`${summary}-details`}>
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
                                    <ReactMarkdown key={hashString(logLine)}>
                                        {logLine || "No further details"}
                                    </ReactMarkdown>
                                )}
                            </div>
                        ),
                    },
                ]}
                sx={{
                    fontSize: "large",
                    marginBottom: "1rem",
                    display: showThinking || isFinalAnswer ? "block" : "none",
                    boxShadow: isFinalAnswer
                        ? `0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 
                                    0 9px 28px 8px rgba(0, 0, 0, 0.05)`
                        : "none",
                }}
            />
        )
    }

    /**
     * Introduce the agent to the user with a friendly greeting
     */
    const introduceAgent = () => {
        updateOutput(
            <UserQueryDisplay
                userQuery={cleanUpAgentName(targetAgent)}
                title={targetAgent}
                userImage={AGENT_IMAGE}
            />
        )

        // Random greeting
        const greeting = AGENT_GREETINGS[Math.floor(Math.random() * AGENT_GREETINGS.length)]
        updateOutput(greeting)
    }

    /**
     * Render the connectivity info as a list of origins and their tools
     * @param connectivityInfo The connectivity info to render
     * @returns A ReactNode representing the connectivity info with agents and their tools
     */
    const renderConnectivityInfo = (connectivityInfo: ConnectivityInfo[]) => (
        <>
            {connectivityInfo
                // Don't show connection to self
                .filter((info) => info.origin.toLowerCase() !== targetAgent.toLowerCase())
                // Sort by origin name
                .sort((a, b) => a.origin.localeCompare(b.origin))
                // Render each origin and its tools
                .map((info) => (
                    <li
                        id={info.origin}
                        key={info.origin}
                    >
                        <b id={info.origin}>{info.origin}</b>
                        <ul
                            id={`${info.origin}-tools`}
                            style={{marginLeft: "8px"}}
                        >
                            {info?.tools?.map((tool) => (
                                <li
                                    id={tool}
                                    key={tool}
                                >
                                    {tool}
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
        </>
    )

    useEffect(() => {
        const newAgent = async () => {
            if (clearChatOnNewAgent) {
                // New agent, so clear chat context if desired
                chatContext.current = null
                currentResponse.current = ""
                slyData.current = null
                setChatOutput([])
            }

            // Introduce the agent to the user
            introduceAgent()

            // if not neuro san agent return since we won't get connectivity info
            if (isLegacyAgentType(targetAgent)) {
                return
            }

            let agentFunction: FunctionResponse

            // It is a Neuro-san agent, so get the function and connectivity info
            try {
                agentFunction = await getAgentFunction(neuroSanURL, targetAgent, currentUser)
            } catch {
                // For now, just return. May be a legacy agent without a functional description in Neuro-san.
                return
            }

            try {
                const connectivity: ConnectivityResponse = await getConnectivity(neuroSanURL, targetAgent, currentUser)
                updateOutput(
                    <MUIAccordion
                        id={`${id}-agent-details`}
                        sx={{
                            marginTop: "1rem",
                            marginBottom: "1rem",
                            backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-white)",
                            borderColor: darkMode ? "var(--bs-white)" : "var(--bs-border-color)",
                            color: darkMode ? "var(--bs-white)" : "var(--bs-primary)",
                        }}
                        items={[
                            {
                                title: "Agent Details",
                                content: [
                                    `My description is: "${agentFunction?.function?.description}"`,
                                    <h6
                                        key="item-1"
                                        id="connectivity-header"
                                        style={{marginTop: "1rem"}}
                                    >
                                        I can connect you to the following agents
                                    </h6>,
                                    <ul
                                        key="item-2"
                                        id="connectivity-list"
                                        aria-labelledby="connectivity-header"
                                        style={{marginTop: "1rem"}}
                                    >
                                        {renderConnectivityInfo(connectivity?.connectivity_info.concat())}
                                    </ul>,
                                ],
                            },
                        ]}
                    />
                )
            } catch (e) {
                sendNotification(
                    NotificationType.error,
                    `Failed to get connectivity info for ${cleanUpAgentName(targetAgent)}. Error: ${e}`
                )
            }
        }

        if (targetAgent) {
            void newAgent()
        }
    }, [targetAgent])

    /**
     * Handles adding content to the output window.
     * @param node A ReactNode to add to the output window -- text, spinner, etc. but could also be  simple string
     * @returns Nothing, but updates the output window with the new content. Updates currentResponse as a side effect.
     */
    const updateOutput = (node: ReactNode) => {
        currentResponse.current += node
        setChatOutput((currentOutput) => [...currentOutput, node])
    }

    /**
     * Reset the state of the component. This is called after a request is completed, regardless of success or failure.
     */
    const resetState = () => {
        // Reset state, whatever happened during request
        setIsAwaitingLlm(false)
        setChatInput("")
        lastAIMessage.current = ""
        finalAnswerRef.current = null

        // Get agent name, either from the enum (Neuro-san) or from the targetAgent string directly (legacy)
        setPreviousResponse?.(targetAgent, currentResponse.current)
        currentResponse.current = ""
    }

    const handleStop = () => {
        try {
            controller?.current?.abort()
            controller.current = null
            updateOutput(
                <MUIAlert
                    id="opp-finder-error-occurred-alert"
                    severity="warning"
                >
                    Request cancelled.
                </MUIAlert>
            )
        } finally {
            resetState()
        }
    }

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !chatInput || chatInput.length === 0 || hasOnlyWhitespace(chatInput)

    // Enable Send button when there is user input and not awaiting a response
    const shouldEnableSendButton = !userInputEmpty && !isAwaitingLlm

    // Enable regenerate button when there is a previous query to resent, and we're not awaiting a response
    const shouldEnableRegenerateButton = previousUserQuery && !isAwaitingLlm

    // Enable Clear Chat button if not awaiting response and there is chat output to clear
    const enableClearChatButton = !isAwaitingLlm && chatOutput.length > 0

    /**
     * Extract the final answer from the response from a legacy agent
     * @param response The response from the legacy agent
     * @returns The final answer from the agent, if it exists or null if it doesn't
     */
    const extractFinalAnswer = (response: string) =>
        /Final Answer: (?<finalAnswerText>.*)/su.exec(response)?.groups?.["finalAnswerText"]

    const handleChunk = (chunk: string): void => {
        // Give container a chance to process the chunk first
        const onChunkReceivedResult = onChunkReceived?.(chunk) ?? true
        succeeded.current = succeeded.current || onChunkReceivedResult

        // For legacy agents, we either get plain text or markdown. Just output it as-is.
        if (isLegacyAgentType(targetAgent)) {
            // Display output as-is
            updateOutput(chunk)

            // Check for Final Answer from legacy agent
            const finalAnswerMatch = extractFinalAnswer(currentResponse.current)
            if (finalAnswerMatch) {
                lastAIMessage.current = finalAnswerMatch
            }
            return
        }

        // For Neuro-san agents, we expect a ChatMessage structure in the chunk.
        const chatMessage: ChatMessage | null = chatMessageFromChunk(chunk)
        if (!chatMessage) {
            // This is an error since Neuro-san agents should send us ChatMessage structures.
            // But don't want to spam output by logging errors for every bad message.
            return
        }

        // It's a ChatMessage. Does it have chat context? Only AGENT_FRAMEWORK messages can have chat context.
        if (chatMessage.type === ChatMessageType.AGENT_FRAMEWORK && chatMessage.chat_context) {
            // Save the chat context, potentially overwriting any previous ones we received during this session.
            // We only care about the last one received.
            chatContext.current = chatMessage.chat_context

            // Nothing more to do with this message. It's just a message to give us the chat context, so return
            return
        }

        // Merge slyData.current with incoming chatMessage.sly_data
        if (chatMessage.sly_data) {
            slyData.current = {...slyData.current, ...chatMessage.sly_data}
        }

        // Check if there is an error block in the "structure" field of the chat message.
        if (chatMessage.structure) {
            // If there is an error block, we should display it as an alert.
            const errorMessage = checkError(chatMessage.structure)
            if (errorMessage) {
                updateOutput(
                    <MUIAlert
                        id="retry-message-alert"
                        severity="warning"
                    >
                        {errorMessage}
                    </MUIAlert>
                )
                succeeded.current = false
            }
        } else if (chatMessage?.text?.trim() !== "") {
            // Not an error, so output it if it has text. The backend sometimes sends messages with no
            // text content and we don't want to display those to the user.
            // Agent name is the last tool in the origin array. If it's not there, use a default name.
            const agentName =
                chatMessage.origin?.length > 0
                    ? cleanUpAgentName(chatMessage.origin[chatMessage.origin.length - 1].tool)
                    : "Agent message"
            updateOutput(processLogLine(chatMessage.text, agentName, chatMessage.type))
        }
    }

    async function doQueryLoop(query: string) {
        succeeded.current = false

        let attemptNumber: number = 0
        let wasAborted: boolean = false

        do {
            try {
                // Increment the attempt number and set the state to indicate we're awaiting a response
                attemptNumber += 1

                // Check which agent type we are dealing with
                if (isLegacyAgentType(targetAgent)) {
                    // It's a legacy agent (these go directly to the LLM and are different from the Neuro-san agents).

                    // Send the chat query to the server. This will block until the stream ends from the server
                    await sendLlmRequest(
                        handleChunk,
                        controller?.current.signal,
                        legacyAgentEndpoint,
                        extraParams,
                        query,
                        chatHistory.current
                    )
                } else {
                    // It's a Neuro-san agent.

                    // Some coded tools (data generator...) expect the user name provided in slyData.
                    const slyDataWithUserName = {...slyData.current, login: currentUser}
                    await sendChatQuery(
                        neuroSanURL,
                        controller?.current.signal,
                        query,
                        targetAgent,
                        handleChunk,
                        chatContext.current,
                        slyDataWithUserName,
                        currentUser
                    )
                }
            } catch (error: unknown) {
                // Was it due to user aborting the request?
                wasAborted = error instanceof Error && error.name === "AbortError"
                if (wasAborted) {
                    // AbortErrors are handled elsewhere. We also want to stop retries here.
                    break
                }

                if (!wasAborted) {
                    if (error instanceof Error) {
                        console.error(error, error.stack)
                    }
                    updateOutput(
                        <MUIAlert
                            id="opp-finder-error-occurred-alert"
                            severity="error"
                        >
                            {`Error occurred: ${error}`}
                        </MUIAlert>
                    )
                }
            }
        } while (attemptNumber < MAX_AGENT_RETRIES && !succeeded.current)
        return {wasAborted}
    }

    const handleSend = async (query: string) => {
        // Record user query in chat history
        chatHistory.current = [...chatHistory.current, new HumanMessage(previousUserQuery)]

        // Allow parent to intercept and modify the query before sending if needed
        const queryToSend = onSend?.(query) ?? query

        // Save query for "regenerate" use. Again we save the real user input, not the modified query. It will again
        // get intercepted and re-modified (if applicable) on "regenerate".
        setPreviousUserQuery(query)

        setIsAwaitingLlm(true)

        // Always start output by echoing user query.
        // Note: we display the original user query, not the modified one. The modified one could be a monstrosity
        // that we generated behind their back. Ultimately, we shouldn't need to generate a fake query on behalf of the
        // user but currently we do for orchestration.
        updateOutput(
            <UserQueryDisplay
                userQuery={query}
                title={currentUser}
                userImage={userImage}
            />
        )

        // Add ID block for agent
        updateOutput(
            <UserQueryDisplay
                userQuery={cleanUpAgentName(targetAgent)}
                title={targetAgent}
                userImage={AGENT_IMAGE}
            />
        )

        // Allow clients to do something when streaming starts
        onStreamingStarted?.()

        // Set up the abort controller
        controller.current = new AbortController()
        setIsAwaitingLlm(true)

        if (showThinking) {
            updateOutput(
                <MUIAccordion
                    id="initiating-orchestration-accordion"
                    items={[
                        {
                            title: `Contacting ${cleanUpAgentName(targetAgent)}...`,
                            content: `Query: ${queryToSend}`,
                        },
                    ]}
                    sx={{marginBottom: "1rem"}}
                />
            )
        }
        try {
            const {wasAborted} = await doQueryLoop(queryToSend)

            if (!wasAborted && !succeeded.current) {
                updateOutput(
                    <MUIAlert
                        id="opp-finder-max-retries-exceeded-alert"
                        severity="error"
                    >
                        {`Gave up after ${MAX_AGENT_RETRIES} attempts.`}
                    </MUIAlert>
                )
            }

            // Display prominent "Final Answer" message if we have one
            if (lastAIMessage.current) {
                // Legacy agents text is a bit messy and doesn't add a blank line, so we add it here
                if (isLegacyAgentType(targetAgent)) {
                    updateOutput("    \n\n")
                }

                updateOutput(
                    <div
                        id="final-answer-div"
                        ref={finalAnswerRef}
                        style={{marginBottom: "1rem"}}
                    >
                        {processLogLine(lastAIMessage.current, "Final Answer", ChatMessageType.AI, true)}
                    </div>
                )
            }

            // Add a blank line after response
            updateOutput("\n")

            // Record bot answer in history.
            if (currentResponse?.current?.length > 0) {
                chatHistory.current = [...chatHistory.current, new AIMessage(currentResponse.current)]
            }
        } finally {
            resetState()

            // Allow parent components to do something when streaming is complete
            onStreamingComplete?.()
        }
    }

    useVoiceRecognition({
        speechSupported,
        voiceRefs,
        voiceState,
        setVoiceState,
        handleSend,
        setIsProcessingSpeech,
        setChatInput,
    })

    return (
        <Box
            id={`llm-chat-${id}`}
            sx={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
                height: "100%",
            }}
        >
            {title && (
                <Box
                    id={`llm-chat-title-container-${id}`}
                    sx={{
                        alignItems: "center",
                        backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-primary)",
                        borderTopLeftRadius: "var(--bs-border-radius)",
                        borderTopRightRadius: "var(--bs-border-radius)",
                        display: "flex",
                        justifyContent: "space-between",
                        paddingLeft: "1rem",
                        paddingRight: "0.5rem",
                        paddingTop: "0.25rem",
                        paddingBottom: "0.25rem",
                    }}
                >
                    <Typography
                        id={`llm-chat-title-${id}-text`}
                        sx={{fontSize: "0.9rem", color: "var(--bs-white)"}}
                    >
                        {title}
                    </Typography>
                    {onClose && (
                        <IconButton
                            data-testid={`close-button-${id}`}
                            id={`close-button-${id}`}
                            onClick={onClose}
                        >
                            <CloseIcon
                                id={`close-icon-${id}`}
                                sx={{color: "var(--bs-white)"}}
                            />
                        </IconButton>
                    )}
                </Box>
            )}
            <Box
                id="llm-response-div"
                sx={{
                    ...divStyle,
                    border: "var(--bs-border-width) var(--bs-border-style)",
                    borderColor: darkMode ? "var(--bs-white)" : "var(--bs-primary)",
                    borderRadius: "var(--bs-border-radius)",
                    display: "flex",
                    flexGrow: 1,
                    height: "100%",
                    margin: "10px",
                    position: "relative",
                    overflowY: "auto",
                }}
            >
                <Tooltip
                    id="show-thinking"
                    title={showThinking ? "Displaying agent thinking" : "Hiding agent thinking"}
                >
                    <span id="show-thinking-span">
                        <LlmChatOptionsButton
                            enabled={showThinking}
                            id="show-thinking-button"
                            onClick={() => setShowThinking(!showThinking)}
                            posRight={150}
                            disabled={isAwaitingLlm}
                        >
                            <AccountTreeIcon
                                id="show-thinking-icon"
                                sx={{color: "var(--bs-white)", fontSize: "0.85rem"}}
                            />
                        </LlmChatOptionsButton>
                    </span>
                </Tooltip>
                <Tooltip
                    id="enable-autoscroll"
                    title={autoScrollEnabled ? "Autoscroll enabled" : "Autoscroll disabled"}
                >
                    <LlmChatOptionsButton
                        enabled={autoScrollEnabled}
                        id="autoscroll-button"
                        onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                        posRight={80}
                    >
                        <VerticalAlignBottomIcon
                            id="autoscroll-icon"
                            sx={{color: "var(--bs-white)", fontSize: "0.85rem"}}
                        />
                    </LlmChatOptionsButton>
                </Tooltip>
                <Tooltip
                    id="wrap-tooltip"
                    title={shouldWrapOutput ? "Text wrapping enabled" : "Text wrapping disabled"}
                >
                    <LlmChatOptionsButton
                        enabled={shouldWrapOutput}
                        id="wrap-button"
                        onClick={() => setShouldWrapOutput(!shouldWrapOutput)}
                        posRight={10}
                    >
                        <WrapTextIcon
                            id="wrap-icon"
                            sx={{color: "var(--bs-white)", fontSize: "0.85rem"}}
                        />
                    </LlmChatOptionsButton>
                </Tooltip>
                <Box
                    id="llm-responses"
                    ref={chatOutputRef}
                    sx={{
                        backgroundColor: backgroundColor || "var(--bs-secondary-blue)",
                        borderWidth: "1px",
                        borderRadius: "0.5rem",
                        fontSize: "smaller",
                        resize: "none",
                        overflowY: "auto", // Enable vertical scrollbar
                        paddingBottom: "60px",
                        paddingTop: "7.5px",
                        paddingLeft: "15px",
                        paddingRight: "15px",
                        width: "100%",
                    }}
                    tabIndex={-1}
                >
                    <FormattedMarkdown
                        id={`${id}-formatted-markdown`}
                        nodesList={chatOutput}
                        style={darkMode ? atelierDuneDark : a11yLight}
                        wrapLongLines={shouldWrapOutput}
                    />
                    {isAwaitingLlm && (
                        <Box
                            id="awaitingOutputContainer"
                            sx={{display: "flex", alignItems: "center", fontSize: "smaller"}}
                        >
                            <span
                                id="working-span"
                                style={{marginRight: "1rem"}}
                            >
                                Working...
                            </span>
                            <CircularProgress
                                id="awaitingOutputSpinner"
                                sx={{
                                    color: "var(--bs-primary)",
                                }}
                                size="1rem"
                            />
                        </Box>
                    )}
                </Box>

                <ControlButtons
                    clearChatOnClickCallback={() => {
                        setChatOutput([])
                        chatHistory.current = []
                        chatContext.current = null
                        setPreviousUserQuery("")
                        currentResponse.current = ""
                        lastAIMessage.current = ""
                        introduceAgent()
                    }}
                    enableClearChatButton={enableClearChatButton}
                    isAwaitingLlm={isAwaitingLlm}
                    handleSend={handleSend}
                    handleStop={handleStop}
                    previousUserQuery={previousUserQuery}
                    shouldEnableRegenerateButton={shouldEnableRegenerateButton}
                />
            </Box>
            <Box
                id="user-input-div"
                style={{...divStyle, display: "flex", margin: "10px", alignItems: "flex-end", position: "relative"}}
            >
                <Input
                    autoComplete="off"
                    id="user-input"
                    multiline={true}
                    placeholder={agentPlaceholders[targetAgent] || `Chat with ${cleanUpAgentName(targetAgent)}`}
                    ref={chatInputRef}
                    sx={{
                        backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-white)",
                        border: "var(--bs-border-style) var(--bs-border-width) var(--bs-gray-light)",
                        borderRadius: "var(--bs-border-radius)",
                        color: darkMode ? "var(--bs-white)" : "var(--bs-primary)",
                        display: "flex",
                        flexGrow: 1,
                        fontSize: "smaller",
                        marginRight: "0.75rem",
                        paddingBottom: "0.5rem",
                        paddingTop: "0.5rem",
                        paddingLeft: "1rem",
                        paddingRight: "1rem",
                        transition: "margin-right 0.2s",
                    }}
                    onChange={(event) => {
                        setChatInput(event.target.value)
                    }}
                    onKeyDown={async (event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault()
                            await handleSend(chatInput)
                        }
                    }}
                    value={chatInput}
                    endAdornment={
                        <InputAdornment
                            id="input-adornments"
                            position="end"
                            disableTypography={true}
                        >
                            {/* Voice processing spinner - shows only when actively speaking */}
                            {isProcessingSpeech && (
                                <CircularProgress
                                    size={16}
                                    sx={{
                                        color: "var(--bs-primary)",
                                        marginRight: "0.5rem",
                                    }}
                                />
                            )}
                            <IconButton
                                id="clear-input-button"
                                onClick={() => {
                                    setChatInput("")
                                }}
                                sx={{
                                    color: "var(--bs-primary)",
                                    opacity: userInputEmpty ? "25%" : "100%",
                                }}
                                disabled={userInputEmpty}
                                tabIndex={-1}
                                edge="end"
                            >
                                <ClearIcon id="clear-input-icon" />
                            </IconButton>
                        </InputAdornment>
                    }
                />

                {/* Microphone Button */}
                <MicrophoneButton
                    isMicOn={isMicOn}
                    onMicToggle={setIsMicOn}
                    voiceState={voiceState}
                    setVoiceState={setVoiceState}
                    speechSupported={speechSupported}
                    recognition={voiceRefs.current.recognition}
                    onSendMessage={handleSend}
                />

                {/* Send Button */}
                <SendButton
                    enableSendButton={shouldEnableSendButton}
                    id="submit-query-button"
                    onClickCallback={() => handleSend(chatInput)}
                />
            </Box>
        </Box>
    )
})

// Set a useful display name for the component for debugging purposes. We have to do it here because we're using
// forwardRef in the main definition.
ChatCommon.displayName = "ChatCommon"

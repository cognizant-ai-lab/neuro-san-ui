/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * See main function description.
 */
import {AIMessage, HumanMessage} from "@langchain/core/messages"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import ClearIcon from "@mui/icons-material/Clear"
import CloseIcon from "@mui/icons-material/Close"
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom"
import WrapTextIcon from "@mui/icons-material/WrapText"
import Box from "@mui/material/Box"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import Input from "@mui/material/Input"
import InputAdornment from "@mui/material/InputAdornment"
import {alpha, useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {jsonrepair} from "jsonrepair"
import {
    CSSProperties,
    Dispatch,
    isValidElement,
    ReactNode,
    Ref,
    SetStateAction,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react"
import ReactMarkdown from "react-markdown"
import SyntaxHighlighter from "react-syntax-highlighter"
import {v4 as uuid} from "uuid"

import {AgentConnectivity} from "./AgentConnectivity"
import {ChatHistory} from "./ChatHistory"
import {ControlButtons} from "./ControlButtons"
import {FormattedMarkdown} from "./FormattedMarkdown"
import {AGENT_GREETINGS} from "./Greetings"
import {SampleQueries} from "./SampleQueries"
import {SendButton} from "./SendButton"
import {HLJS_THEMES} from "./SyntaxHighlighterThemes"
import {UserQueryDisplay} from "./UserQueryDisplay"
import {getAgentFunction, getConnectivity, sendChatQuery} from "../../../controller/agent/Agent"
import {sendLlmRequest, StreamingUnit} from "../../../controller/llm/LlmChat"
import {
    ChatMessage,
    ChatMessageType,
    ConnectivityResponse,
    FunctionResponse,
} from "../../../generated/neuro-san/NeuroSanClient"
import {useAgentChatHistoryStore} from "../../../state/ChatHistory"
import {hashString, hasOnlyWhitespace} from "../../../utils/text"
import {LlmChatOptionsButton} from "../../Common/LlmChatOptionsButton"
import {MUIAccordion} from "../../Common/MUIAccordion"
import {MUIAlert} from "../../Common/MUIAlert"
import {NotificationType, sendNotification} from "../../Common/notification"
import {CombinedAgentType, isLegacyAgentType} from "../Common/Types"
import {chatMessageFromChunk, checkError, cleanUpAgentName, removeTrailingUuid} from "../Common/Utils"
import {MicrophoneButton} from "../VoiceChat/MicrophoneButton"
import {cleanupAndStopSpeechRecognition, setupSpeechRecognition, SpeechRecognitionState} from "../VoiceChat/VoiceChat"

export interface ChatCommonProps {
    /**
     * HTML id to use for the outer component
     */
    readonly id: string

    /**
     * The current username of the logged-in user. Used for fetching things from APIs mainly
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

// Key for the chat history, which gets special treatment; always visible even if "show thinking" is off.
const CHAT_HISTORY_KEY = "chat-history-accordion"

// Define fancy EMPTY constant to avoid linter error about using object literals as default props
const EMPTY: Partial<Record<CombinedAgentType, string>> = {}

// Avatar to use for agents in chat
const AGENT_IMAGE = "/agent.svg"

// How many times to retry the entire agent interaction process. Some networks have a well-defined success condition.
// For others, it's just "whenever the stream is done".
const MAX_AGENT_RETRIES = 3

// Type for forward ref to expose the handleStop function
export type ChatCommonHandle = {
    handleStop: () => void
}

/**
 * Extract the final answer from the response from a legacy agent
 * @param response The response from the legacy agent
 * @returns The final answer from the agent, if it exists or undefined if it doesn't
 */
const extractFinalAnswer = (response: string) =>
    /Final Answer: (?<finalAnswerText>.*)/su.exec(response)?.groups?.["finalAnswerText"]

// Maximum number of items to keep in the chat output window
const MAX_CHAT_OUTPUT_ITEMS = 50

/**
 * Common chat component for agent chat. This component is used by all agent chat components to provide a consistent
 * experience for users when chatting with agents. It handles user input as well as displaying and nicely formatting
 * agent responses. Customization for inputs and outputs is provided via event handlers-like props.
 */
export const ChatCommon = ({ref, ...props}: ChatCommonProps & {ref?: Ref<ChatCommonHandle>}) => {
    const {
        agentPlaceholders = EMPTY,
        backgroundColor,
        currentUser,
        extraParams,
        id,
        isAwaitingLlm,
        legacyAgentEndpoint,
        neuroSanURL,
        onChunkReceived,
        onClose,
        onSend,
        onStreamingComplete,
        onStreamingStarted,
        setIsAwaitingLlm,
        setPreviousResponse,
        targetAgent,
        title,
        userImage,
    } = props
    // MUI theme
    const theme = useTheme()
    const shadowColor = theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.common.black

    // User LLM chat input
    const [chatInput, setChatInput] = useState<string>("")

    // Previous user query (for "regenerate" feature)
    const previousUserQuery = useRef<string>("")

    // Chat output window contents
    const [chatOutput, setChatOutput] = useState<ReactNode[]>([])

    // To accumulate current response, which will be different from the contents of the output window if there is a
    // chat session
    const currentResponse = useRef<string>("")

    // Ref for output text area, so we can auto scroll it
    const chatOutputRef = useRef(null)

    // Ref for user input text area, so we can handle shift-enter
    const chatInputRef = useRef(null)

    // Controller for cancelling fetch request
    const controller = useRef<AbortController>(null)

    // For tracking if we're auto-scrolling. A button allows the user to enable or disable auto-scrolling.
    const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true)

    // ref for same
    const autoScrollEnabledRef = useRef<boolean>(autoScrollEnabled)

    // Whether to wrap output text
    const [shouldWrapOutput, setShouldWrapOutput] = useState<boolean>(true)

    // Keeps a copy of the last AI message so we can highlight it as "final answer"
    const lastAIMessage = useRef<string>("")

    // Ref for the final answer key, so we can highlight the accordion
    const finalAnswerKey = useRef<string>("")

    // Persistent agent chat history store, which is where we store both kinds of chat histories
    // (see store implementation for details)
    const storedChatHistory = useAgentChatHistoryStore((state) => state?.history?.[targetAgent])
    const agentChatHistory = useMemo(
        () => storedChatHistory ?? {chatHistory: [], chatContext: null, slyData: {}},
        [storedChatHistory]
    )
    const [agentSampleQueries, setAgentSampleQueries] = useState<string[]>([])

    // Access store for context items
    const updateChatContext = useAgentChatHistoryStore((state) => state.updateChatContext)
    const updateChatHistory = useAgentChatHistoryStore((state) => state.updateChatHistory)
    const updateSlyData = useAgentChatHistoryStore((state) => state.updateSlyData)
    const resetHistory = useAgentChatHistoryStore((state) => state.resetHistory)

    // Ref to the item we think is the Final Answer from the agent
    const finalAnswerRef = useRef<HTMLDivElement>(null)

    // Track state of "show thinking" toggle
    const [showThinking, setShowThinking] = useState<boolean>(false)

    // Microphone state for voice input
    const [isMicOn, setIsMicOn] = useState<boolean>(false)

    // Ref for speech recognition
    const speechRecognitionRef = useRef<SpeechRecognition | null>(null)

    // Voice state for speech recognition
    const [voiceInputState, setVoiceInputState] = useState<SpeechRecognitionState>({
        currentTranscript: "",
        finalTranscript: "",
        isListening: false,
        isProcessingSpeech: false,
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

    const darkMode = theme.palette.mode === "dark"

    const {atelierDuneDark, a11yLight} = HLJS_THEMES

    const agentDisplayName = useMemo(() => cleanUpAgentName(removeTrailingUuid(targetAgent)), [targetAgent])

    useEffect(() => {
        // Set up speech recognition
        const handlers = setupSpeechRecognition(setChatInput, setVoiceInputState, speechRecognitionRef)

        // Clean up function
        return () => cleanupAndStopSpeechRecognition(speechRecognitionRef, handlers)
    }, [])

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
            chatOutputRef.current.scrollTop = finalAnswerRef.current.offsetTop - 50
            return
        }

        if (autoScrollEnabledRef.current && chatOutputRef?.current) {
            chatOutputRef.current.scrollTop = chatOutputRef.current.scrollHeight
        }
    }, [chatOutput, isAwaitingLlm])

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
    const processLogLine = useCallback(
        (logLine: string, summary: string, messageType: ChatMessageType, isFinalAnswer?: boolean): ReactNode => {
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
                                        <ReactMarkdown key={hashString(logLine)}>{logLine}</ReactMarkdown>
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
        },
        [a11yLight, atelierDuneDark, darkMode, shadowColor, shouldWrapOutput]
    )

    /**
     * Handles adding content to the output window. We only store the last MAX_CHAT_OUTPUT_ITEMS items to keep
     * memory usage down.
     * @param node A ReactNode to add to the output window -- text, spinner, etc. but could also be  simple string
     * @returns Nothing, but updates the output window with the new content.
     */
    const updateOutput = useCallback((node: ReactNode) => {
        setChatOutput((current) => {
            const next = [...current, node]
            return next.length > MAX_CHAT_OUTPUT_ITEMS ? next.slice(-MAX_CHAT_OUTPUT_ITEMS) : next
        })
    }, [])

    const handleChunk = useCallback(
        (chunk: string): void => {
            // Give container a chance to process the chunk first
            const onChunkReceivedResult = onChunkReceived?.(chunk) ?? true
            succeeded.current = succeeded.current || onChunkReceivedResult

            // For legacy agents, we either get plain text or Markdown. Just output it as-is.
            if (isLegacyAgentType(targetAgent)) {
                // Display output as-is
                // TODO: how to handle this? don't want to save every single chunk as a separate item in history?!
                updateOutput(chunk)
                currentResponse.current += chunk

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

            // Shallow merge existing slyData with incoming chatMessage.sly_data
            if (chatMessage.sly_data) {
                updateSlyData(targetAgent, chatMessage.sly_data)
            }

            // It's a ChatMessage. Does it have chat context? Only AGENT_FRAMEWORK messages can have chat context.
            if (chatMessage.type === ChatMessageType.AGENT_FRAMEWORK && chatMessage.chat_context) {
                // Save the chat context, potentially overwriting any previous ones we received during this session.
                // We only care about the last one received.
                updateChatContext(targetAgent, chatMessage.chat_context)
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
                // Not an error, so output it if it has text. The backend sometimes sends messages with no text content,
                // and we don't want to display those to the user.
                // Agent name is the last tool in the origin array. If it's not there, use a default name.
                const agentName =
                    chatMessage.origin?.length > 0
                        ? cleanUpAgentName(chatMessage.origin[chatMessage.origin.length - 1].tool)
                        : "Agent message"
                updateOutput(processLogLine(chatMessage.text, agentName, chatMessage.type))
                currentResponse.current += chatMessage.text
            }
        },
        [onChunkReceived, processLogLine, updateSlyData, targetAgent, updateChatContext, updateOutput]
    )

    const introduceAgent = useCallback(() => {
        /**
         * Introduce the agent to the user with a friendly greeting
         */
        updateOutput(
            <UserQueryDisplay
                userQuery={agentDisplayName}
                title={targetAgent}
                userImage={AGENT_IMAGE}
            />
        )

        // Random greeting
        const greeting = AGENT_GREETINGS[Math.floor(Math.random() * AGENT_GREETINGS.length)]
        updateOutput(greeting)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- updateOutput is stable (empty useCallback deps)
    }, [agentDisplayName, targetAgent])

    /**
     * Reset the state of the component. This is called after a request is completed, regardless of success or failure.
     */
    const resetState = useCallback(() => {
        // Reset state, whatever happened during request
        setIsAwaitingLlm(false)
        setChatInput("")
        lastAIMessage.current = ""
        finalAnswerRef.current = null

        // Get agent name, either from the enum (Neuro-san) or from the targetAgent string directly (legacy)
        setPreviousResponse?.(targetAgent, currentResponse.current)
        currentResponse.current = ""
    }, [setIsAwaitingLlm, setPreviousResponse, targetAgent])

    /*
     * The main logic for sending a query to the server, with retries on errors.
     */
    const doRetryLoop = useCallback(
        async (query: string) => {
            succeeded.current = false

            let attemptNumber: number = 0
            let wasAborted: boolean = false

            do {
                try {
                    // Increment the attempt number and set the state to indicate we're awaiting a response
                    attemptNumber += 1

                    // Check which agent type we are dealing with
                    if (isLegacyAgentType(targetAgent)) {
                        // It's a legacy agent (these go directly to the LLM and are different from
                        // the Neuro-san agents).

                        // Send the chat query to the server. This will block until the stream ends from the server
                        await sendLlmRequest(
                            handleChunk,
                            controller?.current.signal,
                            legacyAgentEndpoint,
                            extraParams,
                            query,
                            agentChatHistory.chatHistory,
                            null,
                            StreamingUnit.Chunk
                        )
                    } else {
                        // It's a Neuro-san agent.

                        // Some coded tools (data generator...) expect the username provided in slyData.
                        const slyDataWithUserName = {...agentChatHistory?.slyData, login: currentUser}
                        await sendChatQuery(
                            neuroSanURL,
                            controller?.current.signal,
                            query,
                            targetAgent,
                            handleChunk,
                            agentChatHistory.chatContext,
                            slyDataWithUserName,
                            currentUser,
                            StreamingUnit.Line
                        )
                    }
                } catch (error: unknown) {
                    // Was it due to user aborting the request?
                    wasAborted = error instanceof Error && error.name === "AbortError"
                    if (wasAborted) {
                        // AbortErrors are handled elsewhere. We also want to stop retries here.
                        break
                    } else {
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
            return wasAborted
        },
        [
            agentChatHistory,
            currentUser,
            extraParams,
            handleChunk,
            legacyAgentEndpoint,
            neuroSanURL,
            targetAgent,
            updateOutput,
        ]
    )

    const handleSend = useCallback(
        async (query: string) => {
            // Record user query in chat history. Discard anything beyond MAX_CHAT_HISTORY_ITEMS
            const userQueryMessage = new HumanMessage({content: query, id: uuid()})
            updateChatHistory(targetAgent, [userQueryMessage])

            // Allow parent to intercept and modify the query before sending if needed
            const queryToSend = onSend?.(query) ?? query

            // Save query for "regenerate" use. Again we save the real user input, not the modified query. It will again
            // get intercepted and re-modified (if applicable) on "regenerate".
            previousUserQuery.current = query

            setIsAwaitingLlm(true)

            // Always start output by echoing user query.
            // Note: we display the original user query, not the modified one. The modified one could be a monstrosity
            // that we generated behind their back. Ultimately, we shouldn't need to generate a fake query on behalf
            // of the user, but currently we do for orchestration.
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
                    userQuery={agentDisplayName}
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
                                title: `Contacting ${agentDisplayName}...`,
                                content: `Query: ${queryToSend}`,
                            },
                        ]}
                        sx={{marginBottom: "1rem"}}
                    />
                )
            }
            try {
                // Invoke the logic to send the request and retry as necessary
                const wasAborted = await doRetryLoop(queryToSend)

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
                    // Record bot answer in history.
                    if (currentResponse?.current?.length > 0) {
                        updateChatHistory(targetAgent, [new AIMessage({content: lastAIMessage.current, id: uuid()})])
                    }
                } else if (isLegacyAgentType(targetAgent) && currentResponse.current.length > 0) {
                    // It's a legacy agent that didn't provide a "Final Answer", so just record the whole response
                    // as the bot answer in that case.
                    updateChatHistory(targetAgent, [new AIMessage({content: currentResponse.current, id: uuid()})])
                }

                // Add a blank line after response
                updateOutput("\n")
            } finally {
                resetState()

                // Allow parent components to do something when streaming is complete
                onStreamingComplete?.()
            }
        },
        [
            agentDisplayName,
            currentUser,
            doRetryLoop,
            onSend,
            onStreamingComplete,
            onStreamingStarted,
            processLogLine,
            resetState,
            setIsAwaitingLlm,
            showThinking,
            targetAgent,
            updateChatHistory,
            updateOutput,
            userImage,
        ]
    )

    useEffect(() => {
        if (targetAgent) {
            introduceAgent()
        }
    }, [targetAgent, introduceAgent])

    useEffect(() => {
        const fetchAgentDetails = async () => {
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
                    <AgentConnectivity
                        id={id}
                        description={agentFunction?.function?.description}
                        connectivityInfo={connectivity?.connectivity_info}
                        targetAgent={targetAgent}
                    />
                )
                const sampleQueries = (connectivity?.metadata?.["sample_queries"] || []) as string[]
                setAgentSampleQueries(sampleQueries)
            } catch (e) {
                sendNotification(
                    NotificationType.error,
                    `Failed to get connectivity info for ${agentDisplayName}. Error: ${e}`
                )
            }
        }

        if (targetAgent && !isLegacyAgentType(targetAgent)) {
            void fetchAgentDetails()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only want to run this when targetAgent changes
    }, [targetAgent])

    const handleStop = useCallback(() => {
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
    }, [resetState, updateOutput])

    // Expose the handleStop method to parent components via ref for external control (e.g., to cancel chat requests)
    useImperativeHandle(
        ref,
        () => ({
            handleStop,
        }),
        [handleStop]
    )

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !chatInput || chatInput.length === 0 || hasOnlyWhitespace(chatInput)

    // Enable Send button when there is user input and not awaiting a response
    const shouldEnableSendButton = !userInputEmpty && !isAwaitingLlm

    // Enable regenerate button when there is a previous query to resent, and we're not awaiting a response
    const shouldEnableRegenerateButton = previousUserQuery && !isAwaitingLlm

    // Enable Clear Chat button if not awaiting response and there is chat output to clear
    const enableClearChatButton = !isAwaitingLlm && chatOutput.length > 0

    const getPlaceholder = () =>
        !targetAgent ? null : agentPlaceholders[targetAgent] || `Chat with ${agentDisplayName}`

    const handleClearChat = useCallback(() => {
        setChatOutput([])
        resetHistory(targetAgent)
        previousUserQuery.current = ""
        currentResponse.current = ""
        lastAIMessage.current = ""
        introduceAgent()
    }, [introduceAgent, resetHistory, targetAgent])

    /**
     * Extract the list of React nodes to display in the output window, potentially filtering out "thinking"
     * nodes if the user has chosen to hide them. Nodes that aren't to be shown are not even added to the DOM.
     * There are a couple of special nodes that are always shown: chat history (collapsible accordion) and whatever
     * we detected as the "final answer" (also a collapsible accordion).
     *
     * We use the MUIAccordion check as a proxy for "lines received from the agents"; everything that isn't
     * a MUIAccordion (e.g. alerts, connectivity info, greetings) is not something we would want to hide when
     * "show thinking" is off, so we always show those regardless of the "show thinking" setting.
     */
    const nodesList = useMemo(
        () =>
            chatOutput
                .map((item) => {
                    if (isValidElement(item) && item.type === MUIAccordion) {
                        const shouldShow =
                            showThinking || item.key === finalAnswerKey.current || item.key === CHAT_HISTORY_KEY
                        return shouldShow ? item : null
                    }
                    return item
                })
                .filter((item) => item !== null),
        [chatOutput, showThinking]
    )

    const getNoAgentOverlay = () => (
        <Box
            id="chat-disabled-overlay"
            sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: theme.zIndex.modal - 1,
                cursor: "not-allowed",
                // Capture all pointer events to prevent interaction with the chat when no agent is selected
                pointerEvents: "all",
            }}
        />
    )

    const getTitle = () => (
        <Box
            id={`llm-chat-title-container-${id}`}
            sx={{
                alignItems: "center",
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
                sx={{fontSize: "0.9rem"}}
            >
                {title}
            </Typography>
            {onClose && (
                <IconButton
                    data-testid={`close-button-${id}`}
                    id={`close-button-${id}`}
                    onClick={onClose}
                >
                    <CloseIcon id={`close-icon-${id}`} />
                </IconButton>
            )}
        </Box>
    )

    const getOptionsButtons = () => (
        <>
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
        </>
    )

    const getResponseBox = () => (
        <Box
            id="llm-response-div"
            sx={{
                ...divStyle,
                border: "var(--bs-border-width) var(--bs-border-style)",
                borderRadius: "var(--bs-border-radius)",
                display: "flex",
                flexGrow: 1,
                height: "100%",
                margin: "10px",
                position: "relative",
                overflowY: "auto",
            }}
        >
            {getOptionsButtons()}
            <Box
                id="llm-responses"
                ref={chatOutputRef}
                sx={{
                    backgroundColor: backgroundColor || undefined,
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
                {agentChatHistory?.chatHistory && (
                    <ChatHistory
                        agentDisplayName={agentDisplayName}
                        chatHistoryKey={CHAT_HISTORY_KEY}
                        currentUser={currentUser}
                        id={`${id}-chat-history`}
                        messages={agentChatHistory.chatHistory}
                        targetAgent={targetAgent}
                        userImage={userImage}
                    />
                )}
                <FormattedMarkdown
                    id={`${id}-formatted-markdown`}
                    nodesList={nodesList}
                    style={darkMode ? atelierDuneDark : a11yLight}
                    wrapLongLines={shouldWrapOutput}
                />
                <SampleQueries
                    disabled={isAwaitingLlm}
                    handleSend={handleSend}
                    sampleQueries={agentSampleQueries}
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
                handleClearChat={handleClearChat}
                enableClearChatButton={enableClearChatButton}
                isAwaitingLlm={isAwaitingLlm}
                handleSend={handleSend}
                handleStop={handleStop}
                previousUserQuery={previousUserQuery.current}
                shouldEnableRegenerateButton={shouldEnableRegenerateButton}
            />
        </Box>
    )

    const getUserInputBox = () => (
        <Box
            id="user-input-div"
            sx={{
                ...divStyle,
                display: "flex",
                margin: "10px",
                alignItems: "flex-end",
                position: "relative",
            }}
        >
            <Input
                autoComplete="off"
                id="user-input"
                multiline={true}
                placeholder={getPlaceholder()}
                ref={chatInputRef}
                sx={{
                    border: "var(--bs-border-style) var(--bs-border-width) var(--bs-gray-light)",
                    borderRadius: "var(--bs-border-radius)",
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
                        {voiceInputState.isProcessingSpeech && (
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
                speechRecognitionRef={speechRecognitionRef}
                voiceInputState={voiceInputState}
                setVoiceInputState={setVoiceInputState}
            />

            {/* Send Button */}
            <SendButton
                enableSendButton={shouldEnableSendButton}
                id="submit-query-button"
                onClickCallback={() => handleSend(chatInput)}
            />
        </Box>
    )

    const getChatBox = () => (
        <Box
            id={`llm-chat-${id}`}
            sx={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
                height: "100%",
                opacity: targetAgent ? 1 : 0.4,
                pointerEvents: targetAgent ? "auto" : "none",
                position: "relative",
            }}
        >
            {title && getTitle()}
            {getResponseBox()}
            {getUserInputBox()}
        </Box>
    )

    return (
        <Box
            id={`llm-chat-${id}`}
            sx={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
                height: "100%",
                position: "relative",
            }}
        >
            {targetAgent ? getChatBox() : getNoAgentOverlay()}
        </Box>
    )
}

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
import {useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {
    CSSProperties,
    Dispatch,
    Ref,
    SetStateAction,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react"
import {v4 as uuid} from "uuid"

import {AgentIntro} from "./AgentIntro"
import {AgentMetadata} from "./AgentMetadata"
import {ChatHistory} from "./ChatHistory"
import {AGENT_IMAGE} from "./Const"
import {ControlButtons} from "./ControlButtons"
import {Conversation} from "./Conversation"
import {ConversationTurn, MessageRole} from "./ConversationTurn"
import {SendButton} from "./SendButton"
import {sendChatQuery} from "../../../controller/agent/Agent"
import {sendLlmRequest, StreamingUnit} from "../../../controller/llm/LlmChat"
import {ChatMessage, ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {useAgentChatHistoryStore} from "../../../state/ChatHistory"
import {hasOnlyWhitespace} from "../../../utils/text"
import {LlmChatOptionsButton} from "../../Common/LlmChatOptionsButton"
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
     * Optional greetings for specific agents to display
     */
    readonly customAgentGreetings?: Partial<Record<CombinedAgentType, string>>

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

    /**
     * Extra sly_data entries to merge into each outgoing request. Used by parent components (e.g. temp networks)
     * to re-supply data that lives outside the IndexedDB slyData store (e.g. localStorage).
     */
    readonly extraSlyData?: Record<string, unknown>
}

// Key for the chat history, which gets special treatment; always visible even if "show thinking" is off.
const CHAT_HISTORY_KEY = "chat-history-accordion"

// Define fancy EMPTY constant to avoid linter error about using object literals as default props
const EMPTY: Partial<Record<CombinedAgentType, string>> = {}

// How many times to retry the entire agent interaction process. Some networks have a well-defined success condition.
// For others, it's just "whenever the stream is done".
const MAX_AGENT_RETRIES = 3

// Type for forward ref to expose the handleStop and handleClearChat functions
export type ChatCommonHandle = {
    handleStop: () => void
    handleClearChat: () => void
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
        customAgentGreetings = EMPTY,
        agentPlaceholders = EMPTY,
        backgroundColor,
        currentUser,
        extraParams,
        extraSlyData,
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

    // User LLM chat input
    const [chatInput, setChatInput] = useState<string>("")

    // Previous user query (for "regenerate" feature)
    const [previousUserQuery, setPreviousUserQuery] = useState<string>("")

    // Turns within the current conversation
    const [turns, setTurns] = useState<ConversationTurn[]>([])

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

    // Whether to wrap output text
    const [shouldWrapOutput, setShouldWrapOutput] = useState<boolean>(true)

    // Keeps a copy of the last AI message so we can highlight it as "final answer"
    const lastAIMessage = useRef<string>("")

    // Persistent agent chat history store, which is where we store both kinds of chat histories
    // (see store implementation for details)
    const storedChatHistory = useAgentChatHistoryStore((state) => state?.history?.[targetAgent])
    const agentChatHistory = useMemo(
        () => storedChatHistory ?? {chatHistory: [], chatContext: null, slyData: {}},
        [storedChatHistory]
    )

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

    const agentDisplayName = useMemo(() => cleanUpAgentName(removeTrailingUuid(targetAgent)), [targetAgent])

    useEffect(() => {
        // Set up speech recognition
        const handlers = setupSpeechRecognition(setChatInput, setVoiceInputState, speechRecognitionRef)

        // Clean up function
        return () => cleanupAndStopSpeechRecognition(speechRecognitionRef, handlers)
    }, [])

    useEffect(() => {
        // Delay for a second before focusing on the input area; gets around ChatBot stealing focus.
        setTimeout(() => chatInputRef?.current?.focus(), 1000)
    }, [])

    // Auto scroll chat output window when new content is added
    useEffect(() => {
        const container = chatOutputRef.current
        if (!container) return

        // Scroll the final answer into view
        if (finalAnswerRef.current && !isAwaitingLlm) {
            container.scrollTop = finalAnswerRef.current.offsetTop - 50
            return
        }

        // Live-streaming auto-scroll
        if (autoScrollEnabled) {
            container.scrollTop = container.scrollHeight
        }
    }, [autoScrollEnabled, isAwaitingLlm, turns])

    const addTurn = useCallback((turn: ConversationTurn) => {
        setTurns((current) => {
            const next = [...current, turn]
            return next.length > MAX_CHAT_OUTPUT_ITEMS ? next.slice(-MAX_CHAT_OUTPUT_ITEMS) : next
        })
    }, [])

    // We use this to update the same "turn" as chunks come in from legacy agents
    const legacyTurnIdRef = useRef<string | null>(null)

    const handleChunk = useCallback(
        (chunk: string): void => {
            // Give container a chance to process the chunk first
            const onChunkReceivedResult = onChunkReceived?.(chunk) ?? true
            succeeded.current = succeeded.current || onChunkReceivedResult

            // For legacy agents, we either get plain text or Markdown. Just output it as-is.
            if (isLegacyAgentType(targetAgent)) {
                currentResponse.current += chunk

                if (!legacyTurnIdRef.current) {
                    // We don't yet have a turn for this response, so create one. On subsequent chunks, we'll just
                    // update the text of this turn.
                    legacyTurnIdRef.current = uuid()
                    addTurn({
                        id: legacyTurnIdRef.current,
                        role: MessageRole.LegacyAgent,
                        text: currentResponse.current,
                        alwaysShow: true,
                    })
                } else {
                    // We already have a turn for this response, so just update the text of that turn.
                    setTurns((prev) =>
                        prev.map((t) => (t.id === legacyTurnIdRef.current ? {...t, text: currentResponse.current} : t))
                    )
                }

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

            // Keep track of AI messages. The last one is (by definition) the "final answer" from the agents.
            if (chatMessage.type === ChatMessageType.AI && chatMessage.text) {
                lastAIMessage.current = chatMessage.text
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
                    addTurn({
                        id: uuid(),
                        role: MessageRole.Warning,
                        text: errorMessage,
                        alwaysShow: true,
                    })
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
                addTurn({
                    id: uuid(),
                    role: MessageRole.Agent,
                    agentName,
                    text: chatMessage.text,
                })
                currentResponse.current += chatMessage.text
            }
        },
        [onChunkReceived, targetAgent, addTurn, updateSlyData, updateChatContext]
    )

    /**
     * Reset the state of the component. This is called after a request is completed, regardless of success or failure.
     */
    const resetState = useCallback(() => {
        // Reset state, whatever happened during request
        setIsAwaitingLlm(false)
        setChatInput("")
        lastAIMessage.current = ""
        finalAnswerRef.current = null

        setPreviousResponse?.(targetAgent, currentResponse.current)
        currentResponse.current = ""
        legacyTurnIdRef.current = null
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
                        const slyDataWithUserName = {...agentChatHistory?.slyData, ...extraSlyData, login: currentUser}
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
                        addTurn({
                            id: uuid(),
                            role: MessageRole.Error,
                            text: `Error occurred: ${error}`,
                            alwaysShow: true,
                        })
                    }
                }
            } while (attemptNumber < MAX_AGENT_RETRIES && !succeeded.current)
            return wasAborted
        },
        [
            addTurn,
            agentChatHistory,
            currentUser,
            extraParams,
            extraSlyData,
            handleChunk,
            legacyAgentEndpoint,
            neuroSanURL,
            targetAgent,
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
            setPreviousUserQuery(query)

            setIsAwaitingLlm(true)

            // Always start output by echoing user query.
            // Note: we display the original user query, not the modified one. The modified one could be a monstrosity
            // that we generated behind their back. Ultimately, we shouldn't need to generate a fake query on behalf
            // of the user, but currently we do for orchestration.
            addTurn({
                id: uuid(),
                role: MessageRole.User,
                text: query,
                alwaysShow: true,
            })

            // Add ID block for agent
            addTurn({
                agentDisplayName,
                agentName: targetAgent,
                alwaysShow: true,
                id: uuid(),
                role: MessageRole.AgentHeader,
                text: agentDisplayName,
            })

            // Allow clients to do something when streaming starts
            onStreamingStarted?.()

            // Set up the abort controller
            controller.current = new AbortController()
            setIsAwaitingLlm(true)

            addTurn({
                agentName: `Contacting ${agentDisplayName}...`,
                id: uuid(),
                role: MessageRole.Agent,
                text: `Query: ${queryToSend}`,
            })
            try {
                // Invoke the logic to send the request and retry as necessary
                const wasAborted = await doRetryLoop(queryToSend)

                if (!wasAborted && !succeeded.current) {
                    addTurn({
                        alwaysShow: true,
                        id: uuid(),
                        role: MessageRole.Error,
                        text: `Gave up after ${MAX_AGENT_RETRIES} attempts.`,
                    })
                }

                // Display prominent "Final Answer" message if we have one
                if (lastAIMessage.current) {
                    addTurn({
                        alwaysShow: true,
                        id: uuid(),
                        role: MessageRole.FinalAnswer,
                        text: lastAIMessage.current,
                    })

                    // Record bot answer in history.
                    if (currentResponse?.current?.length > 0) {
                        updateChatHistory(targetAgent, [new AIMessage({content: lastAIMessage.current, id: uuid()})])
                    }
                } else if (isLegacyAgentType(targetAgent) && currentResponse.current.length > 0) {
                    // It's a legacy agent that didn't provide a "Final Answer", so just record the whole response
                    // as the bot answer in that case.
                    updateChatHistory(targetAgent, [new AIMessage({content: currentResponse.current, id: uuid()})])
                }
            } finally {
                resetState()

                // Allow parent components to do something when streaming is complete
                onStreamingComplete?.()
            }
        },
        [
            addTurn,
            agentDisplayName,
            doRetryLoop,
            onSend,
            onStreamingComplete,
            onStreamingStarted,
            resetState,
            setIsAwaitingLlm,
            targetAgent,
            updateChatHistory,
        ]
    )

    const handleStop = useCallback(() => {
        try {
            controller?.current?.abort()
            controller.current = null
            addTurn({
                alwaysShow: true,
                id: uuid(),
                role: MessageRole.Warning,
                text: "Request cancelled.",
            })
        } finally {
            resetState()
        }
    }, [addTurn, resetState])

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !chatInput || chatInput.length === 0 || hasOnlyWhitespace(chatInput)

    // Enable Send button when there is user input and not awaiting a response
    const shouldEnableSendButton = !userInputEmpty && !isAwaitingLlm

    // Enable regenerate button when there is a previous query to resent, and we're not awaiting a response
    const shouldEnableRegenerateButton = previousUserQuery && !isAwaitingLlm

    // Enable Clear Chat button if not awaiting response and there is chat output to clear
    const enableClearChatButton = !isAwaitingLlm && turns.length > 0

    const getPlaceholder = () =>
        !targetAgent ? null : agentPlaceholders[targetAgent] || `Chat with ${agentDisplayName}`

    const handleClearChat = useCallback(() => {
        setTurns([])
        resetHistory(targetAgent)
        setPreviousUserQuery("")
        currentResponse.current = ""
        lastAIMessage.current = ""
    }, [resetHistory, targetAgent])

    // Expose the handleStop and handleClearChat methods to parent components via ref for external control
    useImperativeHandle(
        ref,
        () => ({
            handleStop,
            handleClearChat,
        }),
        [handleStop, handleClearChat]
    )

    const getNoAgentOverlay = () => (
        <Tooltip
            title="Please select a Network from the list to start the chat."
            placement="auto"
        >
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
        </Tooltip>
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

    const agentIntro = (
        <AgentIntro
            agentDisplayName={agentDisplayName}
            customAgentGreetings={customAgentGreetings}
            key={targetAgent}
            targetAgent={targetAgent}
        />
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
                {agentChatHistory?.chatHistory?.length > 0 && (
                    <ChatHistory
                        agentImage={AGENT_IMAGE}
                        agentDisplayName={agentDisplayName}
                        chatHistoryKey={CHAT_HISTORY_KEY}
                        currentUser={currentUser}
                        id={`${id}-chat-history`}
                        messages={agentChatHistory.chatHistory}
                        targetAgent={targetAgent}
                        userImage={userImage}
                    />
                )}
                {/*For Neuro-san agents, intro goes above the metadata and conversation*/}
                {!isLegacyAgentType(targetAgent) && agentIntro}
                {!isLegacyAgentType(targetAgent) && (
                    <AgentMetadata
                        disableQueries={isAwaitingLlm}
                        handleSend={handleSend}
                        currentUser={currentUser}
                        id={`${id}-agent-metadata-display`}
                        neuroSanURL={neuroSanURL}
                        targetAgent={targetAgent}
                    />
                )}
                <Conversation
                    id={`${id}-conversation-display`}
                    currentUser={currentUser}
                    finalAnswerRef={finalAnswerRef}
                    showThinking={showThinking}
                    shouldWrapOutput={shouldWrapOutput}
                    turns={turns}
                    userImage={userImage}
                />
                {/*For legacy agents, intro goes comes after the conversation as it's a continuous chat stream*/}
                {isLegacyAgentType(targetAgent) && agentIntro}
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
                enableClearChatButton={enableClearChatButton}
                handleClearChat={handleClearChat}
                handleSend={handleSend}
                handleStop={handleStop}
                isAwaitingLlm={isAwaitingLlm}
                previousUserQuery={previousUserQuery}
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

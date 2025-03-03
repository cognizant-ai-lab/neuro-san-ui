/**
 * See main function description.
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import ClearIcon from "@mui/icons-material/Clear"
import {Box, Input, styled} from "@mui/material"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import Tooltip from "@mui/material/Tooltip"
import {jsonrepair} from "jsonrepair"
import NextImage from "next/image"
import {CSSProperties, Dispatch, FC, ReactElement, ReactNode, SetStateAction, useEffect, useRef, useState} from "react"
import {MdOutlineWrapText, MdVerticalAlignBottom} from "react-icons/md"
import SyntaxHighlighter from "react-syntax-highlighter"

import {AgentErrorProps} from "./AgentError"
import {AGENT_GREETINGS} from "./AgentGreetings"
import {HIGHLIGHTER_THEME, MAX_AGENT_RETRIES} from "./const"
import {ControlButtons} from "./ControlButtons"
import {FormattedMarkdown} from "./FormattedMarkdown"
import {SendButton} from "./SendButton"
import {HLJS_THEMES} from "./SyntaxHighlighterThemes"
import {CombinedAgentType} from "./Types"
import {checkError, cleanUpAgentName, splitLogLine, tryParseJson} from "./Utils"
import {DEFAULT_USER_IMAGE} from "../../const"
import {getAgentFunction, getConnectivity, sendChatQuery} from "../../controller/agent/agent"
import {sendLlmRequest} from "../../controller/llm/llm_chat"
import {AgentType as NeuroSanAgent} from "../../generated/metadata"
import {ConnectivityInfo, ConnectivityResponse, FunctionResponse} from "../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../generated/neuro_san/api/grpc/chat"
import {hasOnlyWhitespace} from "../../utils/text"
import {getTitleBase} from "../../utils/title"
import {LlmChatOptionsButton} from "../internal/LlmChatOptionsButton"
import {MUIAccordion} from "../MUIAccordion"
import {MUIAlert} from "../MUIAlert"
import {NotificationType, sendNotification} from "../notification"

// #region: Styled Components

const UserQueryContainer = styled("div")({
    backgroundColor: "#FFF",
    borderRadius: "8px",
    boxShadow: "0 0px 2px 0 rgba(0, 0, 0, 0.15)",
    display: "inline-flex",
    padding: "10px",
})

// #endregion: Styled Components

interface AgentChatCommonProps {
    readonly id: string
    readonly currentUser: string
    readonly userImage: string
    readonly setIsAwaitingLlm: Dispatch<SetStateAction<boolean>>
    readonly isAwaitingLlm: boolean
    readonly targetAgent: CombinedAgentType
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
     * Will be called when the streaming is complete, whatever the reason for termination (normal or error)
     */
    readonly onStreamingComplete?: () => void
    readonly onSend?: (query: string) => string
    readonly setPreviousResponse?: (agent: string, response: string) => void
    readonly setChatHistory?: (val: BaseMessage[]) => void
    readonly getChatHistory?: () => BaseMessage[]
    readonly agentPlaceholders?: Partial<Record<CombinedAgentType, string>>
}

const NO_OP_SET = () => {
    /* do nothing */
}

const NO_OP_GET = () => []

const EMPTY = {}

// Avatar to use for agents in chat
const AGENT_IMAGE = "/agent.svg"

export const getUserImageAndUserQuery = (userQuery: string, title: string, userImage: string): ReactElement => (
    // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
    <div style={{marginBottom: "1rem"}}>
        {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
        <UserQueryContainer>
            <NextImage
                id="user-query-image"
                src={userImage || DEFAULT_USER_IMAGE}
                width={30}
                height={30}
                title={title}
                alt=""
                unoptimized={true}
            />
            <span
                id="user-query"
                style={{marginLeft: "0.625rem", marginTop: "0.125rem"}}
            >
                {userQuery}
            </span>
        </UserQueryContainer>
    </div>
)
export const AgentChatCommon: FC<AgentChatCommonProps> = ({
    id,
    currentUser,
    userImage,
    setIsAwaitingLlm,
    isAwaitingLlm,
    onChunkReceived,
    onStreamingComplete,
    onSend,
    setPreviousResponse,
    setChatHistory = NO_OP_SET,
    getChatHistory = NO_OP_GET,
    targetAgent,
    legacyAgentEndpoint,
    agentPlaceholders = EMPTY,
}) => {
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

    // Use hard-coded highlighter theme for now
    const highlighterTheme = HLJS_THEMES["a11yDark"]

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

    // Sync ref with state variable for use within timer etc.
    useEffect(() => {
        autoScrollEnabledRef.current = autoScrollEnabled
    }, [autoScrollEnabled])

    useEffect(() => {
        document.title = `${getTitleBase()} | Opportunity Finder`

        // Delay for a second before focusing on the input area; gets around ChatBot stealing focus.
        setTimeout(() => chatInputRef?.current?.focus(), 1000)
    }, [])

    // Auto scroll chat output window when new content is added
    useEffect(() => {
        if (autoScrollEnabledRef.current && chatOutputRef?.current) {
            chatOutputRef.current.scrollTop = chatOutputRef.current.scrollHeight
        }
    }, [chatOutput])

    /**
     * Process a log line from the agent and format it nicely using the syntax highlighter and Accordion components.
     * By the time we get to here, it's assumed things like errors and termination conditions have already been handled.
     *
     * @param logLine The log line to process
     * @param messageType The type of the message (AI, LEGACY_LOGS etc.). Used for displaying certain message types
     * differently
     * @returns A React component representing the log line (agent message)
     */
    function processLogLine(logLine: string, messageType?: ChatMessageChatMessageType): ReactNode {
        // extract the parts of the line
        const {summarySentenceCase, logLineDetails} = splitLogLine(logLine)

        let repairedJson: string = null

        try {
            // Attempt to parse as JSON

            // First, repair it
            repairedJson = jsonrepair(logLineDetails)

            // Now try to parse it. We don't care about the result, only if it throws on parsing.
            JSON.parse(repairedJson)
        } catch (e) {
            // Not valid JSON
            repairedJson = null
        }

        const isAIMessage = messageType === ChatMessageChatMessageType.AI

        return (
            <MUIAccordion
                id={`${summarySentenceCase}-panel`}
                defaultExpandedPanelKey={isAIMessage ? 1 : null}
                items={[
                    {
                        title: summarySentenceCase,
                        content: (
                            <div id={`${summarySentenceCase}-details`}>
                                {/* If we managed to parse it as JSON, pretty print it */}
                                {repairedJson ? (
                                    <SyntaxHighlighter
                                        id="syntax-highlighter"
                                        language="json"
                                        style={HIGHLIGHTER_THEME}
                                        showLineNumbers={false}
                                        wrapLines={true}
                                    >
                                        {repairedJson}
                                    </SyntaxHighlighter>
                                ) : (
                                    logLineDetails || "No further details"
                                )}
                            </div>
                        ),
                    },
                ]}
                sx={{
                    fontSize: "large",
                    marginBottom: "1rem",
                    backgroundColor: isAIMessage ? "var(--bs-accent3-light)" : undefined,
                }}
            />
        )
    }
    /**
     * Introduce the agent to the user with a friendly greeting
     */
    const introduceAgent = () => {
        updateOutput(getUserImageAndUserQuery(cleanUpAgentName(targetAgent), targetAgent, AGENT_IMAGE))

        // Random greeting
        const greeting = AGENT_GREETINGS[Math.floor(Math.random() * AGENT_GREETINGS.length)]
        updateOutput(greeting)
    }

    const getConnectivityInfo = (connectivityInfo: ConnectivityInfo[]) => (
        /* eslint-disable enforce-ids-in-jsx/missing-ids */
        <>
            {connectivityInfo
                .filter((info) => info.origin.toLowerCase() !== targetAgent.toLowerCase())
                .sort((a, b) => a.origin.localeCompare(b.origin))
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
                            {info.tools.map((tool) => (
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
        /* eslint-enable enforce-ids-in-jsx/missing-ids */
    )

    useEffect(() => {
        const newAgent = async () => {
            introduceAgent()

            // if not neuro san agent, just return since we won't get connectivity info
            if (!(targetAgent in NeuroSanAgent)) {
                return
            }

            // It is a Neuro-san agent, so get the function and connectivity info
            let agentFunction: FunctionResponse

            try {
                agentFunction = await getAgentFunction(currentUser, targetAgent as NeuroSanAgent)
            } catch (e) {
                // For now, just return. May be a legacy agent without a functional description in Neuro-San.
                return
            }

            try {
                const connectivity: ConnectivityResponse = await getConnectivity(
                    currentUser,
                    targetAgent as NeuroSanAgent
                )
                updateOutput(
                    <MUIAccordion
                        id={`${id}-agent-details`}
                        sx={{marginTop: "1rem", marginBottom: "1rem"}}
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
                                        style={{marginTop: "1rem"}}
                                    >
                                        {getConnectivityInfo(connectivity?.connectivityInfo)}
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
     * @param node A ReactNode to add to the output window -- text, spinner, etc.
     * @returns Nothing, but updates the output window with the new content
     */
    const updateOutput = (node: ReactNode) => {
        // Auto scroll as response is generated
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

        // Get agent name, either from the enum (Neuro-san) or from the targetAgent string directly (legacy)
        const agentName = NeuroSanAgent[targetAgent] || targetAgent
        setPreviousResponse?.(agentName, currentResponse.current)
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
            setIsAwaitingLlm(false)
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

    async function doQueryLoop(query: string, queryToSend: string) {
        let succeeded: boolean = false

        function handleChunk(chunk: string) {
            succeeded = onChunkReceived?.(chunk) || true
            // Could be a ChatMessage (Neuro-san) or just a string (legacy agent)
            const parsedResult: null | object | string = tryParseJson(chunk)
            if (typeof parsedResult === "string") {
                updateOutput(chunk)
            } else if (typeof parsedResult === "object") {
                // It's a ChatMessage. Does it have the error block?
                const isError = checkError(parsedResult)
                if (isError) {
                    const agentError: AgentErrorProps = parsedResult as AgentErrorProps
                    const errorMessage =
                        `Error occurred. Error: "${agentError.error}", ` +
                        `traceback: "${agentError?.traceback}", ` +
                        `tool: "${agentError?.tool}" Retrying...`
                    updateOutput(
                        <MUIAlert
                            id="retry-message-alert"
                            severity="warning"
                        >
                            {errorMessage}
                        </MUIAlert>
                    )
                    succeeded = false
                } else {
                    // Not an error, so output it
                    const chatMessage: ChatMessage = parsedResult as ChatMessage
                    updateOutput(processLogLine(chatMessage.text, chatMessage.type))
                }
            }
        }

        let attemptNumber: number = 0
        let wasAborted: boolean = false

        do {
            try {
                // Increment the attempt number and set the state to indicate we're awaiting a response
                attemptNumber += 1

                // check if targetAgent is Neuro-san agent type. We have to use a different "send" function
                // for those.
                if (targetAgent in NeuroSanAgent) {
                    // It's a Neuro-san agent.

                    // Send the chat query to the server. This will block until the stream ends from the server
                    await sendChatQuery(
                        controller?.current.signal,
                        query,
                        currentUser,
                        targetAgent as NeuroSanAgent,
                        handleChunk
                    )
                } else {
                    // It's a legacy agent.

                    // Send the chat query to the server. This will block until the stream ends from the server
                    await sendLlmRequest(
                        handleChunk,
                        controller?.current.signal,
                        legacyAgentEndpoint,
                        {requestType: targetAgent},
                        queryToSend,
                        getChatHistory()
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
        } while (attemptNumber < MAX_AGENT_RETRIES && !succeeded)
        return {succeeded, wasAborted}
    }

    const handleSend = async (query: string) => {
        // Record user query in chat history
        setChatHistory([...getChatHistory(), new HumanMessage(previousUserQuery)])

        // Allow parent to intercept and modify the query before sending if needed
        const queryToSend = onSend?.(query) ?? query
        setPreviousUserQuery(queryToSend)

        setIsAwaitingLlm(true)

        // Always start output by echoing user query.
        updateOutput(getUserImageAndUserQuery(queryToSend, currentUser, userImage))

        // Add ID block for agent
        updateOutput(getUserImageAndUserQuery(cleanUpAgentName(targetAgent), targetAgent, AGENT_IMAGE))

        // Set up the abort controller
        controller.current = new AbortController()
        setIsAwaitingLlm(true)

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
        try {
            const {succeeded, wasAborted} = await doQueryLoop(query, queryToSend)

            if (!wasAborted && !succeeded) {
                updateOutput(
                    <MUIAlert
                        id="opp-finder-max-retries-exceeded-alert"
                        severity="error"
                    >
                        {`Gave up after ${MAX_AGENT_RETRIES} attempts.`}
                    </MUIAlert>
                )
            }
        } finally {
            setIsAwaitingLlm(false)
            resetState()
            onStreamingComplete?.()
        }

        // Add a blank line after response
        updateOutput("\n")

        // Record bot answer in history.
        if (currentResponse?.current?.length > 0) {
            setChatHistory([...getChatHistory(), new AIMessage(currentResponse.current)])
        }
    }

    return (
        <Box
            id={`llm-chat-${id}`}
            sx={{marginTop: "1rem", marginBottom: "1rem"}}
        >
            <Box
                id="llm-response-div"
                sx={{...divStyle, height: "60vh", margin: "10px", position: "relative", marginTop: "1rem"}}
            >
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
                        <MdVerticalAlignBottom
                            id="autoscroll-icon"
                            size="15px"
                            style={{color: "white"}}
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
                        <MdOutlineWrapText
                            id="wrap-icon"
                            size="15px"
                            style={{color: "white"}}
                        />
                    </LlmChatOptionsButton>
                </Tooltip>
                <Box
                    id="llm-responses"
                    ref={chatOutputRef}
                    sx={{
                        backgroundColor: "var(--bs-secondary-blue)",
                        borderWidth: "1px",
                        borderRadius: "0.5rem",
                        fontSize: "smaller",
                        height: "100%",
                        resize: "none",
                        overflowY: "scroll", // Enable vertical scrollbar
                        paddingBottom: "7.5px",
                        paddingTop: "7.5px",
                        paddingLeft: "15px",
                        paddingRight: "15px",
                    }}
                    tabIndex={-1}
                >
                    <FormattedMarkdown
                        id={`${id}-formatted-markdown`}
                        nodesList={chatOutput}
                        style={highlighterTheme}
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

                <ControlButtons // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    clearChatOnClickCallback={() => {
                        setChatOutput([])
                        setChatHistory([])
                        setPreviousUserQuery("")
                        currentResponse.current = ""
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
                style={{...divStyle, display: "flex", margin: "10px", alignItems: "center", position: "relative"}}
            >
                <Input
                    autoComplete="off"
                    id="user-input"
                    placeholder={agentPlaceholders[targetAgent] || `Chat with ${cleanUpAgentName(targetAgent)}`}
                    ref={chatInputRef}
                    sx={{
                        display: "flex",
                        flexGrow: 1,
                        marginRight: "0.5rem",
                        borderWidth: "1px",
                        borderColor: "var(--bs-border-color)",
                        borderRadius: "0.5rem",
                        fontSize: "smaller",
                        paddingBottom: "7.5px",
                        paddingTop: "7.5px",
                        paddingLeft: "15px",
                        paddingRight: "15px",
                    }}
                    onChange={(event) => {
                        setChatInput(event.target.value)
                    }}
                    value={chatInput}
                    endAdornment={
                        <InputAdornment
                            id="clear-input-adornment"
                            position="end"
                            disableTypography={true}
                        >
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

                {/* Send Button */}
                <SendButton
                    enableSendButton={shouldEnableSendButton}
                    id="submit-query-button"
                    onClickCallback={() => handleSend(chatInput)}
                />
            </Box>
        </Box>
    )
}

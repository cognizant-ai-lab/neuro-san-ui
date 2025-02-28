/**
 * See main function description.
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import {Box, Button, Input, SxProps} from "@mui/material"
import CircularProgress from "@mui/material/CircularProgress"
import Tooltip from "@mui/material/Tooltip"
import {CSSProperties, Dispatch, FC, ReactNode, SetStateAction, useEffect, useRef, useState} from "react"
import {MdOutlineWrapText, MdVerticalAlignBottom} from "react-icons/md"

import {processLogLine, sendStreamingChatRequest} from "./AgentChatHandling"
import {AgentChatMultiButtons} from "./AgentChatMultiButtons"
import {AgentChatSendButton} from "./AgentChatSendButton"
import {AGENT_GREETINGS} from "./AgentGreetings"
import {cleanUpAgentName, CombinedAgentType, getUserImageAndUserQuery} from "./common"
import {FormattedMarkdown} from "./FormattedMarkdown"
import {chatMessageFromChunk} from "./JsonUtils"
import {HLJS_THEMES} from "./SyntaxHighlighterThemes"
import {getAgentFunction, getConnectivity} from "../../controller/agent/agent"
import {sendLlmRequest} from "../../controller/llm/llm_chat"
import {AgentType} from "../../generated/metadata"
import {ConnectivityResponse, FunctionResponse} from "../../generated/neuro_san/api/grpc/agent"
import {ChatMessage} from "../../generated/neuro_san/api/grpc/chat"
import {hasOnlyWhitespace} from "../../utils/text"
import {getTitleBase} from "../../utils/title"
import {LlmChatOptionsButton} from "../internal/LlmChatOptionsButton"
import {MUIAccordion} from "../MUIAccordion"
import {MUIAlert} from "../MUIAlert"
import {NotificationType, sendNotification} from "../notification"

interface AgentChatCommonProps {
    readonly id: string
    readonly currentUser: string
    readonly userImage: string
    readonly setIsAwaitingLlm: Dispatch<SetStateAction<boolean>>
    readonly isAwaitingLlm: boolean
    readonly targetAgent: CombinedAgentType
    readonly legacyAgentEndpoint?: string
    /**
     * Optional extra callback for containers to do extra things with the chunks as they are received
     */
    readonly onChunkReceived?: (chunk: string) => void
    /**
     * Will be called when the streaming is complete, whatever the reason for termination (normal or error)
     */
    readonly onStreamingComplete?: () => void
    readonly setPreviousResponse?: (agent: string, response: string) => void
    readonly setChatHistory?: (val: BaseMessage[]) => void
    readonly getChatHistory?: () => BaseMessage[]
    readonly agentPlaceholders?: Partial<Record<CombinedAgentType, string>>
    readonly sx?: SxProps
}

const NO_OP_SET = () => {
    /* do nothing */
}

const NO_OP_GET = () => []

const EMPTY = {}

// Avatar to use for agents in chat
const AGENT_IMAGE = "/agent.svg"

export const AgentChatCommon: FC<AgentChatCommonProps> = ({
    id,
    currentUser,
    userImage,
    setIsAwaitingLlm,
    isAwaitingLlm,
    onChunkReceived,
    onStreamingComplete,
    setPreviousResponse,
    setChatHistory = NO_OP_SET,
    getChatHistory = NO_OP_GET,
    targetAgent,
    legacyAgentEndpoint,
    agentPlaceholders = EMPTY,
    sx,
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

    function introduceAgent() {
        updateOutput(getUserImageAndUserQuery(cleanUpAgentName(targetAgent), targetAgent, AGENT_IMAGE))

        // Random greeting
        const greeting = AGENT_GREETINGS[Math.floor(Math.random() * AGENT_GREETINGS.length)]
        updateOutput(greeting)
    }

    useEffect(() => {
        const newAgent = async () => {
            let agentFunction: FunctionResponse

            try {
                agentFunction = await getAgentFunction(currentUser, targetAgent as AgentType)
            } catch (e) {
                // For now, just return. May be a legacy agent without a functional description in Neuro-San.
                return
            }

            introduceAgent()

            let connectivity: ConnectivityResponse
            try {
                connectivity = await getConnectivity(currentUser, targetAgent as AgentType)
            } catch (e) {
                sendNotification(
                    NotificationType.error,
                    `Failed to get connectivity info for ${cleanUpAgentName(targetAgent)}. Error: ${e}`
                )
                return
            }

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
                                    {connectivity.connectivityInfo
                                        .filter((info) => info.origin.toLowerCase() !== targetAgent.toLowerCase())
                                        .sort((a, b) => a.origin.localeCompare(b.origin))
                                        .map((info) => (
                                            // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                                            <li
                                                id={info.origin}
                                                key={info.origin}
                                            >
                                                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                                                <b id={info.origin}>{info.origin}</b>
                                                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
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
                                </ul>,
                            ],
                        },
                    ]}
                />
            )
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
        const agentName = AgentType[targetAgent] || targetAgent
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

    const handleSend = async (query: string) => {
        try {
            // Record user query in chat history
            setChatHistory([...getChatHistory(), new HumanMessage(previousUserQuery)])

            setPreviousUserQuery(query)

            setIsAwaitingLlm(true)

            // Always start output by echoing user query.
            updateOutput(getUserImageAndUserQuery(query, currentUser, userImage))

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
                            title: `Contacting ${cleanUpAgentName(targetAgent)} agent...`,
                            content: `Query: ${query}`,
                        },
                    ]}
                    sx={{marginBottom: "1rem"}}
                />
            )

            // check if targetAgent is Neuro-san agent type. We have to use a different "send" function for those.
            if (targetAgent in AgentType) {
                // It's a Neuro-san agent.

                // Send the chat query to the server. This will block until the stream ends from the server
                await sendStreamingChatRequest(
                    updateOutput,
                    controller,
                    currentUser,
                    query,
                    targetAgent as AgentType,
                    (chunk: string) => {
                        const chatMessage: ChatMessage = chatMessageFromChunk(chunk)
                        if (chatMessage) {
                            updateOutput(processLogLine(chatMessage.text, chatMessage.type))
                        }
                        onChunkReceived?.(chunk)
                    }
                )
            } else {
                // It's a legacy agent.
                // Send the chat query to the server. This will block until the stream ends from the server
                await sendLlmRequest(
                    (chunk: string) => {
                        updateOutput(chunk)
                        onChunkReceived?.(chunk)
                    },
                    controller?.current.signal,
                    legacyAgentEndpoint,
                    {requestType: targetAgent},
                    query,
                    getChatHistory()
                )
            }

            // Add a blank line after response
            updateOutput("\n")

            // Record bot answer in history.
            if (currentResponse?.current?.length > 0) {
                setChatHistory([...getChatHistory(), new AIMessage(currentResponse.current)])
            }
        } catch (error) {
            const isAbortError = error instanceof Error && error.name === "AbortError"

            if (error instanceof Error) {
                // AbortErrors are handled elsewhere
                if (!isAbortError) {
                    updateOutput(
                        <MUIAlert
                            id="opp-finder-error-occurred-alert"
                            severity="error"
                        >
                            {`Error occurred: ${error}`}
                        </MUIAlert>
                    )

                    // log error to console
                    console.error(error)
                }
            }
        } finally {
            setIsAwaitingLlm(false)
            resetState()
            onStreamingComplete?.()
        }
    }

    return (
        <Box
            id={`llm-chat-${id}`}
            sx={{...sx, marginTop: "1rem", marginBottom: "1rem"}}
        >
            <Box
                id="llm-response-div"
                sx={{...divStyle, height: "50vh", margin: "10px", position: "relative", marginTop: "1rem"}}
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

                <AgentChatMultiButtons // eslint-disable-line enforce-ids-in-jsx/missing-ids
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
                />

                {/* Clear Input Button */}
                <Button
                    id="clear-input-button"
                    onClick={() => {
                        setChatInput("")
                    }}
                    style={{
                        backgroundColor: "transparent",
                        color: "var(--bs-primary)",
                        border: "none",
                        fontWeight: 550,
                        lineHeight: "35px",
                        opacity: userInputEmpty ? "25%" : "100%",
                        position: "absolute",
                        right: 60,
                        zIndex: 99999,
                    }}
                    disabled={userInputEmpty}
                    tabIndex={-1}
                >
                    X
                </Button>

                {/* Send Button */}
                <AgentChatSendButton
                    enableSendButton={shouldEnableSendButton}
                    id="submit-query-button"
                    onClickCallback={() => handleSend(chatInput)}
                />
            </Box>
        </Box>
    )
}

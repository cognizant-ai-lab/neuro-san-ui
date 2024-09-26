/**
 * See main function description.
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import {Alert, Tooltip} from "antd"
import {capitalize} from "lodash"
import {CSSProperties, FormEvent, ReactElement, useEffect, useRef, useState} from "react"
import {Button, Form, InputGroup} from "react-bootstrap"
import {BsDatabaseAdd, BsStopBtn, BsTrash} from "react-icons/bs"
import {FaArrowRightLong} from "react-icons/fa6"
import {FiRefreshCcw} from "react-icons/fi"
import {LuBrainCircuit} from "react-icons/lu"
import {MdOutlineWrapText} from "react-icons/md"
import {RiMenuSearchLine} from "react-icons/ri"
import {TfiPencilAlt} from "react-icons/tfi"
import ClipLoader from "react-spinners/ClipLoader"

import {MaximumBlue} from "../../../const"
import {getLogs, sendChatQuery} from "../../../controller/agent/agent"
import {sendOpportunityFinderRequest} from "../../../controller/opportunity_finder/opportunity_finder"
import {AgentStatus, ChatResponse, LogsResponse} from "../../../generated/agent"
import {OpportunityFinderRequestType} from "../../../pages/api/gpt/opportunityFinder/types"
import {useAuthentication} from "../../../utils/authentication"
import {hasOnlyWhitespace} from "../../../utils/text"
import BlankLines from "../../blanklines"

// Regex to extract project and experiment IDs from agent response
const AGENT_RESULT_REGEX = /assistant: \{'project_id': '(?<projectId>\d+)', 'experiment_id': '(?<experimentId>\d+)'\}/u

// Interval for polling the agents for logs
const AGENT_POLL_INTERVAL_MS = 5_000

// Maximum duration for polling the agents for logs
const MAX_POLLING_DURATION_SECS = 90

// Maximum number of polling attempts for logs.
const MAX_POLLING_ATTEMPTS = (MAX_POLLING_DURATION_SECS * 1_000) / AGENT_POLL_INTERVAL_MS

/**
 * This is the main module for the opportunity finder. It implements a page that allows the user to interact with
 * an LLM to discover opportunities for a business, to scope them out, generate synthetic data, and even finally to
 * generate a project and experiment, all automatically.
 */
export function OpportunityFinder(): ReactElement {
    // User LLM chat input
    const [userLlmChatInput, setUserLlmChatInput] = useState<string>("")

    // Previous user query (for "regenerate" feature)
    const [previousUserQuery, setPreviousUserQuery] = useState<string>("")

    // User LLM chat output
    const [userLlmChatOutput, setUserLlmChatOutput] = useState<string>("")

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)
    const isAwaitingLlmRef = useRef(false)

    // Track index of last log seen from agents
    const lastLogIndexRef = useRef<number>(-1)

    // Use useRef here since we don't want changes in the chat history to trigger a re-render
    const chatHistory = useRef<BaseMessage[]>([])

    // To accumulate current response, which will be different than the contents of the output window if there is a
    // chat session
    const currentResponse = useRef<string>("")

    // Previous responses from the agents. Necessary to save this since currentResponse gets cleared each time, and
    // when we call the experiment generator we need the scoping agent + data generator responses as input
    const previousResponse = useRef<Record<OpportunityFinderRequestType, string | null>>({
        OpportunityFinder: null,
        ScopingAgent: null,
        DataGenerator: null,
        OrchestrationAgent: null,
    })

    // Selected option for agent to interact with
    const [selectedAgent, setSelectedAgent] = useState<OpportunityFinderRequestType>("OpportunityFinder")

    // Ref for output text area, so we can auto scroll it
    const llmOutputTextAreaRef = useRef(null)

    // Ref for user input text area, so we can handle shift-enter
    const inputAreaRef = useRef(null)

    // Controller for cancelling fetch request
    const controller = useRef<AbortController>(null)

    // Ref for tracking if we're autoscrolling. We stop autoscrolling if the user scrolls manually
    const autoScrollEnabled = useRef<boolean>(true)

    // Internal flag to let us know when we generated a scroll event programmatically
    const isProgrammaticScroll = useRef<boolean>(false)

    // Whether to wrap output text
    const [shouldWrapOutput, setShouldWrapOutput] = useState<boolean>(true)

    // For access to logged in session and current user name
    const {data: session} = useAuthentication()
    const currentUser: string = session.user.name

    // Session ID for orchestration
    const sessionId = useRef<string>(null)

    // For newly created project/experiment URL
    const [projectUrl, setProjectUrl] = useState<string>(null)

    // To track number of polling attempts for logs so we know when to give up
    const pollingAttempts = useRef(0)

    function clearInput() {
        setUserLlmChatInput("")
    }

    useEffect(() => {
        isAwaitingLlmRef.current = isAwaitingLlm
    }, [isAwaitingLlm])

    useEffect(() => {
        // Delay for a second before focusing on the input area; gets around ChatBot stealing focus.
        setTimeout(() => {
            inputAreaRef?.current?.focus()
        }, 1000)
    }, [])

    /**
     * End the orchestration process.
     * @param intervalId The ID for the interval timer for polling
     */
    function endOrchestration(intervalId: number) {
        clearInterval(intervalId)
        setIsAwaitingLlm(false)
        sessionId.current = null
    }

    // Poll the agent for logs when the Orchestration Agent is being used
    useEffect(() => {
        function pollAgent() {
            const intervalId = setInterval(async () => {
                if (isAwaitingLlmRef.current) {
                    // Already a request in progress
                    return
                }

                pollingAttempts.current += 1
                if (pollingAttempts.current > MAX_POLLING_ATTEMPTS) {
                    // Too many polling attempts; give up
                    tokenReceivedHandler("• Error occurred: polling for logs timed out\n\n")
                    console.debug("Giving up on polling for logs")
                    endOrchestration(intervalId)
                    return
                }

                try {
                    setIsAwaitingLlm(true)

                    const response: LogsResponse = await getLogs(
                        sessionId.current,
                        controller?.current.signal,
                        currentUser
                    )
                    console.debug("Logs response", response)

                    // Check for new logs
                    if (response?.logs?.length > 0 && response.logs.length > lastLogIndexRef.current) {
                        // Get new logs
                        const newLogs = response.logs.slice(lastLogIndexRef.current + 1)
                        lastLogIndexRef.current = response.logs.length - 1

                        // Process new logs and display summaries to user
                        for (const logLine of newLogs) {
                            // extract the part of the line only up to ">>>"
                            const logLineSummary = logLine.split(">>>")[0]
                            const summarySentenceCase = logLineSummary.replace(/\w+/gu, capitalize)
                            tokenReceivedHandler(`• ${summarySentenceCase}\n\n`)
                        }
                    }

                    // Any status other than "FOUND" means something went wrong
                    if (response.status !== AgentStatus.FOUND) {
                        tokenReceivedHandler(
                            `Error occurred: session ${sessionId?.current} not found, status: ${response.status}\n\n`
                        )
                        endOrchestration(intervalId)
                    } else if (response.chatResponse) {
                        // Check for completion of orchestration
                        console.debug("Chat response", response.chatResponse)

                        // check if response contains project info
                        const matches = AGENT_RESULT_REGEX.exec(response.chatResponse)
                        if (matches) {
                            // We found the agent completion message
                            tokenReceivedHandler("• Experiment generation complete.\n\n")
                            endOrchestration(intervalId)

                            const projectId = matches.groups.projectId
                            const experimentId = matches.groups.experimentId

                            const url = `/projects/${projectId}/experiments/${experimentId}/?generated=true`
                            setProjectUrl(url)
                        }
                    }
                } finally {
                    setIsAwaitingLlm(false)
                }
            }, AGENT_POLL_INTERVAL_MS) as unknown as number

            // Cleanup function to clear the interval
            return () => clearInterval(intervalId)
        }

        if (sessionId.current) {
            pollingAttempts.current = 0
            return pollAgent()
        } else {
            return undefined
        }
    }, [sessionId.current])

    /**
     * Handles a token received from the LLM via callback on the fetch request.
     * @param token The token received from the LLM
     */
    function tokenReceivedHandler(token: string) {
        // Auto scroll as response is generated
        if (llmOutputTextAreaRef.current && autoScrollEnabled.current) {
            isProgrammaticScroll.current = true
            llmOutputTextAreaRef.current.scrollTop = llmOutputTextAreaRef.current.scrollHeight + 100
        }
        currentResponse.current += token
        setUserLlmChatOutput((currentOutput) => currentOutput + token)
    }

    // Sends user query to backend.
    async function sendQuery(userQuery: string) {
        try {
            // Enable autoscrolling by default
            autoScrollEnabled.current = true

            // Record user query in chat history
            chatHistory.current = [...chatHistory.current, new HumanMessage(userQuery)]

            setPreviousUserQuery(userQuery)

            setIsAwaitingLlm(true)

            // Always start output by echoing user query
            setUserLlmChatOutput((currentOutput) => `${currentOutput}\nQuery:\n${userQuery}\n\nResponse:\n\n`)

            const abortController = new AbortController()
            controller.current = abortController

            if (selectedAgent === "OrchestrationAgent") {
                await handleOrchestration()
            } else {
                // Send the query to the server. Response will be streamed to our callback which updates the output
                // display as tokens are received.
                await sendOpportunityFinderRequest(
                    userQuery,
                    selectedAgent,
                    tokenReceivedHandler,
                    abortController.signal,
                    chatHistory.current
                )
            }

            // Add a couple of blank lines after response
            setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\n`)

            // Record bot answer in history.
            if (currentResponse.current) {
                chatHistory.current = [...chatHistory.current, new AIMessage(currentResponse.current)]
            }
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\nRequest cancelled.\n\n`)
            } else {
                // Add error to output
                setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\nError occurred: ${error}\n\n`)

                // log error to console
                console.error(error)
            }
        } finally {
            // Reset state, whatever happened during request
            setIsAwaitingLlm(false)
            clearInput()
            previousResponse.current[selectedAgent] = currentResponse.current
            currentResponse.current = ""
        }
    }

    /**
     * Handler for user query.
     *
     * @param event The event containing the user query
     */
    async function handleUserQuery(event: FormEvent<HTMLFormElement>) {
        // Prevent submitting form
        event.preventDefault()
        await sendQuery(userLlmChatInput)
    }

    function handleStop() {
        try {
            controller?.current?.abort()
            controller.current = null
        } finally {
            setIsAwaitingLlm(false)
            clearInput()
            previousResponse.current[selectedAgent] = currentResponse.current
            currentResponse.current = ""
        }
    }

    // Determine if awaiting response from any of the agents
    const awaitingResponse = isAwaitingLlm || Boolean(sessionId.current)

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !userLlmChatInput || userLlmChatInput.length === 0 || hasOnlyWhitespace(userLlmChatInput)

    // Disable Send when request is in progress
    const shouldDisableSendButton = userInputEmpty || awaitingResponse

    // Disable Send when request is in progress
    const shouldDisableRegenerateButton = !previousUserQuery || awaitingResponse

    // Width for the various buttons -- "regenerate", "stop" etc.
    const actionButtonWidth = 126

    const disableClearChatButton = awaitingResponse || userLlmChatOutput.length === 0

    /**
     * Get the class name for the agent button.
     * @param agentType The agent type, eg. "OpportunityFinder"
     * @returns The class name for the agent button
     */
    function getClassName(agentType: OpportunityFinderRequestType) {
        return `opp-finder-agent-div${selectedAgent === agentType ? " selected" : ""}`
    }

    function getAgentButtonStyle(isEnabled: boolean): CSSProperties {
        return {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: isEnabled ? 1 : 0.5,
        }
    }

    async function handleOrchestration() {
        const abortController = new AbortController()
        controller.current = abortController

        const orchestrationQuery = previousResponse.current.DataGenerator
        console.debug("Orchestration query", orchestrationQuery)
        try {
            const response: ChatResponse = await sendChatQuery(abortController.signal, SONY_INPUT, currentUser)
            console.debug("Orchestration response", response)

            if (response.status !== AgentStatus.CREATED) {
                setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\nError occurred: ${response.status}\n\n`)
            } else {
                console.debug("Orchestration session ID", response.sessionId)
                sessionId.current = response.sessionId
            }
        } catch (e) {
            setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\nError occurred: ${e}\n\n`)
        }
    }

    /**
     * Generate the agent buttons
     * @returns A div containing the agent buttons
     */
    function getAgentButtons() {
        const enableOrchestration = true || (previousResponse.current.DataGenerator !== null && !awaitingResponse)

        return (
            <div
                id="agent-icons-div"
                style={{
                    display: "flex",
                    justifyContent: "space-evenly",
                    alignItems: "center",
                    height: "100%",
                    marginTop: "2rem",
                    marginBottom: "2rem",
                    marginLeft: "6rem",
                    marginRight: "6rem",
                }}
            >
                <div
                    id="opp-finder-agent-div"
                    style={getAgentButtonStyle(!awaitingResponse)}
                    onClick={() => !awaitingResponse && setSelectedAgent("OpportunityFinder")}
                    className={getClassName("OpportunityFinder")}
                >
                    <RiMenuSearchLine
                        id="opp-finder-agent-icon"
                        size={100}
                        style={{marginBottom: "10px"}}
                    />
                    Opportunity Finder
                </div>
                <FaArrowRightLong
                    id="arrow1"
                    size={100}
                    color="var(--bs-secondary)"
                />
                <div
                    id="scoping-agent-div"
                    style={getAgentButtonStyle(!awaitingResponse)}
                    onClick={() => !awaitingResponse && setSelectedAgent("ScopingAgent")}
                    className={getClassName("ScopingAgent")}
                >
                    <TfiPencilAlt
                        id="scoping-agent-icon"
                        size={100}
                        style={{marginBottom: "10px"}}
                    />
                    Scoping Agent
                </div>
                <FaArrowRightLong
                    id="arrow2"
                    size={100}
                    color="var(--bs-secondary)"
                />
                <div
                    id="opp-finder-agent-div"
                    style={getAgentButtonStyle(!awaitingResponse)}
                    onClick={() => !awaitingResponse && setSelectedAgent("DataGenerator")}
                    className={getClassName("DataGenerator")}
                >
                    <BsDatabaseAdd
                        id="db-agent-icon"
                        size={100}
                        style={{marginBottom: "10px"}}
                    />
                    Data Generator
                </div>
                <FaArrowRightLong
                    id="arrow3"
                    size={100}
                    color="var(--bs-secondary)"
                />
                <Tooltip
                    id="orchestration-tooltip"
                    title={enableOrchestration ? undefined : "Please complete the previous steps first"}
                    style={getAgentButtonStyle(enableOrchestration)}
                >
                    <div
                        id="orchestration-agent-div"
                        style={{...getAgentButtonStyle(enableOrchestration)}}
                        onClick={() => enableOrchestration && setSelectedAgent("OrchestrationAgent")}
                        className={getClassName("OrchestrationAgent")}
                    >
                        <LuBrainCircuit
                            id="db-agent-icon"
                            size={100}
                            style={{marginBottom: "10px"}}
                        />
                        <div
                            id="orchestration-agent-text"
                            style={{textAlign: "center"}}
                        >
                            Orchestration
                        </div>
                    </div>
                </Tooltip>
            </div>
        )
    }

    return (
        <>
            <Form
                id="user-query-form"
                onSubmit={handleUserQuery}
            >
                {getAgentButtons()}
                {projectUrl && (
                    // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                    <Alert
                        type="success"
                        message={
                            <>
                                Your new experiment has been generated. Click{" "}
                                <a
                                    id="new-project-link"
                                    target="_blank"
                                    href={projectUrl}
                                    rel="noreferrer"
                                >
                                    here
                                </a>{" "}
                                to view it
                            </>
                        }
                        style={{fontSize: "large", margin: "10px", marginTop: "20px", marginBottom: "20px"}}
                        showIcon={true}
                        closable={true}
                    />
                )}
                <Form.Group id="llm-chat-group">
                    <div
                        id="llm-response-div"
                        style={{height: "50vh", margin: "10px", position: "relative"}}
                    >
                        <Tooltip
                            id="wrap-tooltip"
                            title="Wrap/unwrap text"
                        >
                            <Button
                                id="wrap-button"
                                style={{
                                    position: "absolute",
                                    right: 10,
                                    top: 10,
                                    zIndex: 99999,
                                    background: MaximumBlue,
                                    borderColor: MaximumBlue,
                                    color: "white",
                                }}
                            >
                                <MdOutlineWrapText
                                    id="wrap-icon"
                                    size="15px"
                                    style={{color: "white", opacity: shouldWrapOutput ? "100%" : "50%"}}
                                    onClick={() => setShouldWrapOutput(!shouldWrapOutput)}
                                />
                            </Button>
                        </Tooltip>
                        <Form.Control
                            id="llm-responses"
                            readOnly={true}
                            ref={llmOutputTextAreaRef}
                            as="textarea"
                            placeholder="(Agent output will appear here)"
                            style={{
                                background: "ghostwhite",
                                borderColor: MaximumBlue,
                                fontFamily: "monospace",
                                fontSize: "smaller",
                                height: "100%",
                                resize: "none",
                                whiteSpace: shouldWrapOutput ? "pre-wrap" : "pre",
                            }}
                            tabIndex={-1}
                            value={userLlmChatOutput}
                            onScroll={
                                // Disable autoscroll if user scrolls manually
                                () => {
                                    if (isProgrammaticScroll.current) {
                                        isProgrammaticScroll.current = false
                                        return
                                    }

                                    // Must be user initiated scroll, so disable autoscroll
                                    autoScrollEnabled.current = false
                                }
                            }
                        />
                        <Button
                            id="clear-chat-button"
                            onClick={() => {
                                setUserLlmChatOutput("")
                                chatHistory.current = []
                                setPreviousUserQuery("")
                            }}
                            variant="secondary"
                            style={{
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                bottom: 10,
                                color: "white",
                                display: awaitingResponse ? "none" : "inline",
                                fontSize: "13.3px",
                                opacity: disableClearChatButton ? "50%" : "70%",
                                position: "absolute",
                                right: 145,
                                width: actionButtonWidth,
                                zIndex: 99999,
                            }}
                            disabled={disableClearChatButton}
                        >
                            <BsTrash
                                id="stop-button-icon"
                                size={15}
                                className="mr-2"
                                style={{display: "inline"}}
                            />
                            Clear chat
                        </Button>
                        <Button
                            id="stop-output-button"
                            onClick={() => handleStop()}
                            variant="secondary"
                            style={{
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                bottom: 10,
                                color: "white",
                                display: awaitingResponse ? "inline" : "none",
                                fontSize: "13.3px",
                                opacity: "70%",
                                position: "absolute",
                                right: 10,
                                width: actionButtonWidth,
                                zIndex: 99999,
                            }}
                        >
                            <BsStopBtn
                                id="stop-button-icon"
                                size={15}
                                className="mr-2"
                                style={{display: "inline"}}
                            />
                            Stop
                        </Button>
                        <Button
                            id="regenerate-output-button"
                            onClick={() => sendQuery(previousUserQuery)}
                            disabled={shouldDisableRegenerateButton}
                            variant="secondary"
                            style={{
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                bottom: 10,
                                color: "white",
                                display: awaitingResponse ? "none" : "inline",
                                fontSize: "13.3px",
                                opacity: shouldDisableRegenerateButton ? "50%" : "70%",
                                position: "absolute",
                                right: 10,
                                width: actionButtonWidth,
                                zIndex: 99999,
                            }}
                        >
                            <FiRefreshCcw
                                id="generate-icon"
                                size={15}
                                className="mr-2"
                                style={{display: "inline"}}
                            />
                            Regenerate
                        </Button>
                    </div>
                    <div
                        id="agent-select-div"
                        style={{
                            fontSize: "90%",
                            marginTop: "15px",
                            marginBottom: "15px",
                            paddingLeft: "10px",
                            paddingRight: "10px",
                        }}
                    />
                    <div
                        id="user-input-div"
                        style={{display: "flex"}}
                    >
                        <InputGroup id="user-input-group">
                            <Form.Control
                                id="user-input"
                                as="textarea"
                                type="text"
                                placeholder={`Message the ${selectedAgent} agent`}
                                ref={inputAreaRef}
                                style={{
                                    fontSize: "90%",
                                    marginLeft: "7px",
                                }}
                                onChange={(event) => {
                                    setUserLlmChatInput(event.target.value)
                                }}
                                value={userLlmChatInput}
                            />
                            <Button
                                id="clear-input-button"
                                onClick={() => {
                                    clearInput()
                                }}
                                style={{
                                    backgroundColor: "transparent",
                                    color: "var(--bs-primary)",
                                    border: "none",
                                    fontWeight: 550,
                                    left: "calc(100% - 45px)",
                                    lineHeight: "35px",
                                    opacity: userInputEmpty ? "25%" : "100%",
                                    position: "absolute",
                                    width: "10px",
                                    zIndex: 99999,
                                }}
                                disabled={userInputEmpty}
                                tabIndex={-1}
                            >
                                X
                            </Button>
                        </InputGroup>
                        <div
                            id="send-div"
                            style={{display: "flex", width: "100px", justifyContent: "center"}}
                        >
                            {awaitingResponse ? (
                                <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                    // ClipLoader does not have an id property
                                    color={MaximumBlue}
                                    loading={true}
                                    size={45}
                                />
                            ) : (
                                <Button
                                    id="submit-query-button"
                                    variant="primary"
                                    type="submit"
                                    disabled={shouldDisableSendButton}
                                    style={{
                                        background: MaximumBlue,
                                        borderColor: MaximumBlue,
                                        color: "white",
                                        opacity: shouldDisableSendButton ? "50%" : "100%",
                                        marginLeft: "10px",
                                        marginRight: "10px",
                                    }}
                                >
                                    Send
                                </Button>
                            )}
                        </div>
                    </div>
                </Form.Group>
            </Form>
            <BlankLines
                id="blank-lines"
                numLines={8}
            />
        </>
    )
}

/**
 * See main function description.
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import {Alert, Collapse, Tooltip} from "antd"
const {Panel} = Collapse
import {capitalize} from "lodash"
import {CSSProperties, FormEvent, ReactElement, ReactNode, useEffect, useReducer, useRef, useState} from "react"
import {Button, Form, InputGroup} from "react-bootstrap"
import {BsDatabaseAdd, BsStopBtn, BsTrash} from "react-icons/bs"
import {FaArrowRightLong} from "react-icons/fa6"
import {FiRefreshCcw} from "react-icons/fi"
import {LuBrainCircuit} from "react-icons/lu"
import {MdOutlineWrapText, MdVerticalAlignBottom} from "react-icons/md"
import {RiMenuSearchLine} from "react-icons/ri"
import {TfiPencilAlt} from "react-icons/tfi"
import ClipLoader from "react-spinners/ClipLoader"

import {SONY_INPUT} from "./sony"
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

// Regex to extract error and traceback from agent response
const AGENT_ERROR_REGEX = /assistant:\s*\{\s*"error": "(?<error>[^"]+)",\s*"traceback":\s*"(?<traceback>[^"]+)"\}/u

// Interval for polling the agents for logs
const AGENT_POLL_INTERVAL_MS = 5_000

// Maximum duration for polling the agents for logs
const MAX_POLLING_DURATION_SECS = 120

// Maximum number of polling attempts for logs.
const MAX_POLLING_ATTEMPTS = (MAX_POLLING_DURATION_SECS * 1_000) / AGENT_POLL_INTERVAL_MS

// Input text placeholders for each agent type
const AGENT_PLACEHOLDERS: Record<OpportunityFinderRequestType, string> = {
    OpportunityFinder: "Business name such as Acme Corporation",
    ScopingAgent: "Scope the selected item",
    DataGenerator: "Generate 1500 rows",
    OrchestrationAgent: "Generate the experiment",
}

/**
 * This is the main module for the opportunity finder. It implements a page that allows the user to interact with
 * an LLM to discover opportunities for a business, to scope them out, generate synthetic data, and even finally to
 * generate a project and experiment, all automatically.
 */
export function OpportunityFinder(): ReactElement {
    // User LLM chat input
    const [chatInput, setChatInput] = useState<string>("")

    // Previous user query (for "regenerate" feature)
    const [previousUserQuery, setPreviousUserQuery] = useState<string>("")

    // Chat output window contents
    const [chatOutput, setChatOutput] = useState<ReactNode[]>([])

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)
    const isAwaitingLlmRef = useRef(false)

    // Track index of last log seen from agents
    const lastLogIndexRef = useRef<number>(-1)

    // Use useRef here since we don't want changes in the chat history to trigger a re-render
    const chatHistory = useRef<BaseMessage[]>([])

    // Keep track of the most recent input to opportunity finder which we expect to be an organization name
    const inputOrganization = useRef<string>(null)

    // To accumulate current response, which will be different than the contents of the output window if there is a
    // chat session
    const currentResponse = useRef<string>("")

    // Previous responses from the agents. Necessary to save this since currentResponse gets cleared each time, and
    // when we call the experiment generator we need the data generator responses as input
    const previousResponse = useRef<Record<OpportunityFinderRequestType, string | null>>({
        OpportunityFinder: null,
        ScopingAgent: null,
        DataGenerator: null,
        OrchestrationAgent: null,
    })

    // Selected option for agent to interact with
    const [selectedAgent, setSelectedAgent] = useState<OpportunityFinderRequestType>("OpportunityFinder")

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

    // For access to logged in session and current user name
    const {
        user: {name: currentUser},
    } = useAuthentication().data

    // Session ID for orchestration. We also use this as an overall "orchestration is in process" flag. If we have a
    // session ID, we are in the orchestration process.
    const sessionId = useRef<string>(null)

    // For newly created project/experiment URL
    const [projectUrl, setProjectUrl] = useState<string>(null)

    // To track number of polling attempts for logs so we know when to give up
    const pollingAttempts = useRef(0)

    // ID for log polling interval timer
    const logPollingIntervalId = useRef<number | null>(null)

    // Kludge: allows us to force a re-render which we need to do when we stop the orchestration process
    const [, forceUpdate] = useReducer((x) => x + 1, 0)

    function clearInput() {
        setChatInput("")
    }

    // Sync ref with state variable for use within timer etc.
    useEffect(() => {
        isAwaitingLlmRef.current = isAwaitingLlm
    }, [isAwaitingLlm])

    // Sync ref with state variable for use within timer etc.
    useEffect(() => {
        autoScrollEnabledRef.current = autoScrollEnabled
    }, [autoScrollEnabled])

    useEffect(() => {
        // Delay for a second before focusing on the input area; gets around ChatBot stealing focus.
        setTimeout(() => chatInputRef?.current?.focus(), 1000)
    }, [])

    /**
     * End the orchestration process. Resets state in preparation for next orchestration.
     */
    function endOrchestration() {
        clearInterval(logPollingIntervalId.current)
        setIsAwaitingLlm(false)
        sessionId.current = null
        lastLogIndexRef.current = -1
        pollingAttempts.current = 0
    }

    useEffect(() => {
        // Poll the agent for logs when the Orchestration Agent is being used
        function pollAgent() {
            // Kick off the polling process
            logPollingIntervalId.current = setInterval(async () => {
                if (isAwaitingLlmRef.current) {
                    // Already a request in progress
                    return
                }

                // Check for too many polling attempts
                pollingAttempts.current += 1
                if (pollingAttempts.current > MAX_POLLING_ATTEMPTS) {
                    // Too many polling attempts; give up
                    updateOutput("• Error occurred: polling for logs timed out\n\n")
                    endOrchestration()
                    return
                }

                // Poll the agent for logs
                try {
                    // Set "busy" flag
                    setIsAwaitingLlm(true)

                    const response: LogsResponse = await getLogs(
                        sessionId.current,
                        controller?.current?.signal,
                        currentUser
                    )

                    // Check for new logs
                    if (response?.logs?.length > 0 && response.logs.length > lastLogIndexRef.current) {
                        // Get new logs
                        const newLogs = response.logs.slice(lastLogIndexRef.current + 1)
                        lastLogIndexRef.current = response.logs.length - 1

                        // Process new logs and display summaries to user
                        for (const logLine of newLogs) {
                            // extract the part of the line only up to ">>>"
                            const logLineElements = logLine.split(">>>")
                            const logLineSummary = logLineElements[0]
                            const logLineDetails = logLineElements[1]
                            const summarySentenceCase = logLineSummary.replace(/\w+/gu, capitalize)

                            const section = (
                                <>
                                    {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                                    <Collapse>
                                        <Panel
                                            id={`${summarySentenceCase}-panel`}
                                            header={summarySentenceCase}
                                            key={summarySentenceCase}
                                            style={{fontSize: "large"}}
                                        >
                                            <p
                                                id={`${summarySentenceCase}-details`}
                                                style={{fontFamily: "monospace"}}
                                            >
                                                {logLineDetails || "No further details"}
                                            </p>
                                        </Panel>
                                    </Collapse>
                                    <br id={`${summarySentenceCase}-br`} />
                                </>
                            )

                            updateOutput(section)
                        }
                    }

                    // Any status other than "FOUND" means something went wrong
                    if (response.status !== AgentStatus.FOUND) {
                        updateOutput(
                            `Error occurred: session ${sessionId?.current} not found, status: ${response.status}\n\n`
                        )
                        endOrchestration()
                    } else if (response.chatResponse) {
                        // Check for error
                        const errorMatches = AGENT_ERROR_REGEX.exec(response.chatResponse)
                        if (errorMatches) {
                            // We found an error message
                            updateOutput(
                                `Error occurred: ${errorMatches.groups.error}. ` +
                                    `Traceback: ${errorMatches.groups.traceback}\n\n`
                            )
                            endOrchestration()
                            return
                        }

                        // Check for completion of orchestration by checking if response contains project info
                        const matches = AGENT_RESULT_REGEX.exec(response.chatResponse)
                        if (matches) {
                            // We found the agent completion message
                            updateOutput(
                                <>
                                    {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                                    <Collapse>
                                        <Panel
                                            id="experiment-generation-complete-panel"
                                            header="Experiment generation complete"
                                            key="Experiment generation complete"
                                            style={{fontSize: "large"}}
                                        >
                                            <p
                                                id="experiment-generation-complete-details"
                                                style={{fontFamily: "monospace"}}
                                            >
                                                No further details
                                            </p>
                                        </Panel>
                                    </Collapse>
                                    <br id="experiment-generation-complete-br" />
                                </>
                            )
                            endOrchestration()

                            // Build the URl and set it in state so the notification will be displayed
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
            return () => clearInterval(logPollingIntervalId.current)
        }

        if (sessionId.current) {
            pollingAttempts.current = 0
            return pollAgent()
        } else {
            return undefined
        }
    }, [sessionId.current])

    /**
     * Handles adding content to the output window.
     * @param node A ReactNode to add to the output window -- text, spinner, etc.
     */
    function updateOutput(node: ReactNode) {
        // Auto scroll as response is generated
        currentResponse.current += node
        setChatOutput((currentOutput) => [...currentOutput, node])
        if (autoScrollEnabledRef.current) {
            // Use setTimeout to ensure that the scroll happens after the new content is rendered
            setTimeout(() => {
                chatOutputRef.current.scrollTop = chatOutputRef.current.scrollHeight
            }, 0)
        }
    }

    // Sends user query to backend.
    async function sendQuery(userQuery: string) {
        try {
            // Record user query in chat history
            chatHistory.current = [...chatHistory.current, new HumanMessage(userQuery)]

            setPreviousUserQuery(userQuery)

            setIsAwaitingLlm(true)

            // Always start output by echoing user query
            updateOutput(`Query:\n${userQuery}\n\nResponse:\n`)

            const abortController = new AbortController()
            controller.current = abortController

            if (selectedAgent === "OrchestrationAgent") {
                await handleOrchestration()
            } else {
                // Record organization name if current agent is OpportunityFinder
                if (selectedAgent === "OpportunityFinder") {
                    inputOrganization.current = userQuery
                }

                // Send the query to the server. Response will be streamed to our callback which updates the output
                // display as tokens are received.
                await sendOpportunityFinderRequest(
                    userQuery,
                    selectedAgent,
                    updateOutput,
                    abortController.signal,
                    chatHistory.current
                )
            }

            // Add a couple of blank lines after response
            updateOutput("\n\n")

            // Record bot answer in history.
            if (currentResponse.current) {
                chatHistory.current = [...chatHistory.current, new AIMessage(currentResponse.current)]
            }
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                updateOutput("\n\nRequest cancelled.\n\n")
            } else {
                // Add error to output
                updateOutput(`\n\nError occurred: ${error}\n\n`)

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
        await sendQuery(chatInput)
    }

    function handleStop() {
        try {
            controller?.current?.abort()
            controller.current = null
        } finally {
            clearInput()
            previousResponse.current[selectedAgent] = currentResponse.current
            currentResponse.current = ""
            endOrchestration()
            forceUpdate()
        }
    }

    // Determine if awaiting response from any of the agents
    const awaitingResponse = isAwaitingLlm || sessionId.current != null

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !chatInput || chatInput.length === 0 || hasOnlyWhitespace(chatInput)

    // Disable Send when request is in progress
    const shouldDisableSendButton = userInputEmpty || awaitingResponse

    // Disable Send when request is in progress
    const shouldDisableRegenerateButton = !previousUserQuery || awaitingResponse

    // Width for the various buttons -- "regenerate", "stop" etc.
    const actionButtonWidth = 126

    const disableClearChatButton = awaitingResponse || chatOutput.length === 0

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

    /**
     * Handle the orchestration process. Sends the initial chat query to initiate the session, and saves the resulting
     * session ID in a ref for later use.
     *
     * @returns Nothing, but sets the session ID for the orchestration process
     */
    async function handleOrchestration() {
        const abortController = new AbortController()
        controller.current = abortController

        // The input to Orchestration is the organization name, if we have it, plus the Python code that generates
        // the data.
        const orchestrationQuery = `Organization in question: Sony\n${SONY_INPUT}`

        try {
            // Send the initial chat query to the server.
            const response: ChatResponse = await sendChatQuery(abortController.signal, orchestrationQuery, currentUser)

            // We expect the response to have status CREATED and to contain the session ID
            if (response.status !== AgentStatus.CREATED || !response.sessionId) {
                updateOutput(`\n\nError occurred: ${response.status}\n\n`)
            } else {
                sessionId.current = response.sessionId
            }
        } catch (e) {
            updateOutput(`\n\nError occurred: ${e}\n\n`)
        }
    }

    /**
     * Generate the agent buttons
     * @returns A div containing the agent buttons
     */
    function getAgentButtons() {
        const enableOrchestration = true

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
                            Orchestrator
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
                            id="enable-autoscroll"
                            title={autoScrollEnabled ? "Autoscroll enabled" : "Autoscroll disabled"}
                        >
                            <Button
                                id="autoscroll-button"
                                style={{
                                    position: "absolute",
                                    right: 65,
                                    top: 10,
                                    zIndex: 99999,
                                    background: autoScrollEnabled ? MaximumBlue : "darkgray",
                                    borderColor: autoScrollEnabled ? MaximumBlue : "darkgray",
                                    color: "white",
                                }}
                                onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                            >
                                <MdVerticalAlignBottom
                                    id="autoscroll-icon"
                                    size="15px"
                                    style={{color: "white"}}
                                />
                            </Button>
                        </Tooltip>
                        <Tooltip
                            id="wrap-tooltip"
                            title={shouldWrapOutput ? "Text wrapping enabled" : "Text wrapping disabled"}
                        >
                            <Button
                                id="wrap-button"
                                style={{
                                    position: "absolute",
                                    right: 10,
                                    top: 10,
                                    zIndex: 99999,
                                    background: shouldWrapOutput ? MaximumBlue : "darkgray",
                                    borderColor: shouldWrapOutput ? MaximumBlue : "darkgray",
                                    color: "white",
                                }}
                                onClick={() => setShouldWrapOutput(!shouldWrapOutput)}
                            >
                                <MdOutlineWrapText
                                    id="wrap-icon"
                                    size="15px"
                                    style={{color: "white"}}
                                />
                            </Button>
                        </Tooltip>
                        <div
                            id="llm-responses"
                            ref={chatOutputRef}
                            style={{
                                background: "ghostwhite",
                                borderColor: MaximumBlue,
                                borderWidth: "1px",
                                borderRadius: "0.5rem",
                                fontFamily: "monospace",
                                fontSize: "smaller",
                                height: "100%",
                                resize: "none",
                                whiteSpace: shouldWrapOutput ? "pre-wrap" : "pre",
                                overflowY: "scroll", // Enable vertical scrollbar
                                paddingBottom: "7.5px",
                                paddingTop: "7.5px",
                                paddingLeft: "15px",
                                paddingRight: "15px",
                            }}
                            tabIndex={-1}
                        >
                            {chatOutput || "(Agent output will appear here)"}
                        </div>
                        <Button
                            id="clear-chat-button"
                            onClick={() => {
                                setChatOutput([])
                                chatHistory.current = []
                                setPreviousUserQuery("")
                                setProjectUrl(null)
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
                                placeholder={AGENT_PLACEHOLDERS[selectedAgent]}
                                ref={chatInputRef}
                                style={{
                                    fontSize: "90%",
                                    marginLeft: "7px",
                                }}
                                onChange={(event) => {
                                    setChatInput(event.target.value)
                                }}
                                value={chatInput}
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

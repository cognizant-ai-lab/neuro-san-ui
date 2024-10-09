/**
 * See main function description.
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import {Alert, Collapse, Tooltip} from "antd"
import {jsonrepair} from "jsonrepair"
import {capitalize} from "lodash"
import {CSSProperties, FormEvent, ReactElement, ReactNode, useEffect, useRef, useState} from "react"
import {Button, Form, InputGroup} from "react-bootstrap"
import {BsDatabaseAdd, BsStopBtn, BsTrash} from "react-icons/bs"
import {FaArrowRightLong} from "react-icons/fa6"
import {FiRefreshCcw} from "react-icons/fi"
import {LuBrainCircuit} from "react-icons/lu"
import {MdOutlineWrapText, MdVerticalAlignBottom} from "react-icons/md"
import {RiMenuSearchLine} from "react-icons/ri"
import {TfiPencilAlt} from "react-icons/tfi"
import ReactMarkdown from "react-markdown"
import Select from "react-select"
import ClipLoader from "react-spinners/ClipLoader"
import SyntaxHighlighter from "react-syntax-highlighter"
import * as hljsStyles from "react-syntax-highlighter/dist/cjs/styles/hljs"
import * as prismStyles from "react-syntax-highlighter/dist/cjs/styles/prism"
import rehypeRaw from "rehype-raw"
import rehypeSlug from "rehype-slug"

import {HLJS_THEMES, PRISM_THEMES} from "./SyntaxHighlighterThemes"
import {MaximumBlue} from "../../../const"
import {getLogs, sendChatQuery} from "../../../controller/agent/agent"
import {sendOpportunityFinderRequest} from "../../../controller/opportunity_finder/opportunity_finder"
import {AgentStatus, ChatResponse, LogsResponse} from "../../../generated/agent"
import {OpportunityFinderRequestType} from "../../../pages/api/gpt/opportunityFinder/types"
import {useAuthentication} from "../../../utils/authentication"
import {hasOnlyWhitespace} from "../../../utils/text"

const {Panel} = Collapse

// Regex to extract project and experiment IDs from agent response
const AGENT_RESULT_REGEX = /assistant: \{'project_id': '(?<projectId>\d+)', 'experiment_id': '(?<experimentId>\d+)'\}/u

// Regex to extract error and traceback from agent response
const AGENT_ERROR_REGEX = /assistant:\s*\{\s*"error": "(?<error>[^"]+)",\s*"traceback":\s*"(?<traceback>[^"]+)"\}/u

// Interval for polling the agents for logs
const AGENT_POLL_INTERVAL_MS = 5_000

// Maximum inactivity time since last agent response before we give up
const MAX_AGENT_INACTIVITY_SECS = 2 * 60

// How many times to retry the entire orchestration process
const MAX_ORCHESTRATION_ATTEMPTS = 3

// Input text placeholders for each agent type
const AGENT_PLACEHOLDERS: Record<OpportunityFinderRequestType, string> = {
    OpportunityFinder: "Business name such as Acme Corporation",
    ScopingAgent: "Scope the selected item",
    DataGenerator: "Generate 1500 rows",
    OrchestrationAgent: "Generate the experiment",
}

// Delimiter for separating logs from agents
const LOGS_DELIMITER = ">>>"

/**
 * This is the main module for the opportunity finder. It implements a page that allows the user to interact with
 * an LLM to discover opportunities for a business, to scope them out, generate synthetic data, and even finally to
 * generate a project and experiment, all automatically.
 */
export function OpportunityFinder(): ReactElement {
    // Theme for syntax highlighter
    const [selectedTheme, setSelectedTheme] = useState<string>("a11yLight")

    // User LLM chat input
    const [chatInput, setChatInput] = useState<string>("")

    // Previous user query (for "regenerate" feature)
    const [previousUserQuery, setPreviousUserQuery] = useState<string>("")

    // Chat output window contents
    const [chatOutput, setChatOutput] = useState<ReactNode[]>([])

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)
    const isAwaitingLlmRef = useRef(false)

    // Track index of last log seen from agents. This is like a "cursor" into the array of logs that keeps track
    // of the last log we've seen.
    const lastLogIndexRef = useRef<number>(-1)

    // Use useRef here since we don't want changes in the chat history to trigger a re-render
    const chatHistory = useRef<BaseMessage[]>([])

    // Keep track of the most recent input to opportunity finder which we expect to be an organization name
    const inputOrganization = useRef<string>(null)

    // To accumulate current response, which will be different than the contents of the output window if there is a
    // chat session
    const [currentResponse, setCurrentResponse] = useState<ReactNode[]>([])

    // corresponding ref to allow us to access the current response in the timer
    const currentResponseRef = useRef<ReactNode[]>(currentResponse)

    // Previous responses from the agents. Necessary to save this since currentResponse gets cleared each time, and
    // when we call the experiment generator we need the data generator responses as input
    const previousResponse = useRef<Record<OpportunityFinderRequestType, ReactNode[] | null>>({
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
    const projectUrl = useRef<string>(null)

    // To track time of last new logs from agents
    const lastLogTime = useRef<number | null>(null)

    // ID for log polling interval timer
    const logPollingIntervalId = useRef<number | null>(null)

    // dynamic import syntax highlighter style based on selected theme
    const highlighterTheme = HLJS_THEMES.includes(selectedTheme)
        ? hljsStyles[selectedTheme]
        : prismStyles[selectedTheme]

    // Orchestration retry count. Bootstrap with 0; we increment this each time we retry the orchestration process.
    const orchestrationAttemptNumber = useRef<number>(0)

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

    // sync response ref
    useEffect(() => {
        currentResponseRef.current = currentResponse
    }, [currentResponse])

    useEffect(() => {
        // Delay for a second before focusing on the input area; gets around ChatBot stealing focus.
        setTimeout(() => chatInputRef?.current?.focus(), 1000)
    }, [])

    function nodesToString(nodesList) {
        return nodesList.filter((node) => typeof node === "string").join("")
    }

    function getFormattedCurrentOutput(outputToFormat) {
        return (
            <div style={{...divStyle}}>
                <ReactMarkdown
                    rehypePlugins={[rehypeRaw, rehypeSlug]}
                    components={{
                        code(props) {
                            const {children, className, ...rest} = props
                            const match = /language-(?<language>\w+)/u.exec(className || "")
                            return match ? (
                                <SyntaxHighlighter
                                    PreTag="div"
                                    language={match.groups.language}
                                    style={highlighterTheme}
                                >
                                    {String(children).replace(/\n$/u, "")}
                                </SyntaxHighlighter>
                            ) : (
                                <code
                                    {...rest}
                                    className={className}
                                >
                                    {children}
                                </code>
                            )
                        },
                        // links in new tab
                        a({...props}) {
                            return (
                                <a
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {props.children}
                                </a>
                            )
                        },
                    }}
                >
                    {nodesToString(outputToFormat)}
                </ReactMarkdown>
            </div>
        )
    }

    function getFullResponse() {
        // dump all parameters to console
        // console.debug("chatOutput:", chatOutput)
        // console.debug("orchestrationInProgress:", orchestrationInProgress)
        // console.debug("currentResponse:", currentResponse)

        return (
            <div style={divStyle}>
                {/* Previous aggregated chat output. Already formatted as markdown. */}
                {chatOutput?.length > 0 && chatOutput}

                {/*Current output*/}
                {currentResponse?.length > 0
                    ? orchestrationInProgress
                        ? currentResponse
                        : getFormattedCurrentOutput(currentResponse)
                    : null}

                {(!chatOutput || chatOutput.length === 0) && (!currentResponse || currentResponse.length === 0)
                    ? "(Agent output will appear here)"
                    : null}
            </div>
        )
    }

    /**
     * End the orchestration process. Resets state in preparation for next orchestration.
     */
    function endOrchestration() {
        clearInterval(logPollingIntervalId.current)
        setIsAwaitingLlm(false)
        sessionId.current = null
        lastLogIndexRef.current = -1
        lastLogTime.current = null
        orchestrationAttemptNumber.current = null
    }

    /**
     * Retry the orchestration process. If we haven't exceeded the maximum number of retries, we'll try again.
     * Issue an appropriate warning or error to the user depending on whether we're retrying or giving up.
     * @param retryMessage The message to display to the user when retrying
     * @param failureMessage The message to display to the user when giving up
     */
    function retry(retryMessage: string, failureMessage: string) {
        if (orchestrationAttemptNumber.current < MAX_ORCHESTRATION_ATTEMPTS) {
            updateCurrentOutput(
                <>
                    {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                    <Alert
                        type="warning"
                        description={retryMessage}
                        showIcon={true}
                        closable={false}
                        style={{fontSize: "large", marginBottom: "1rem"}}
                    />
                </>
            )

            // try again
            void initiateOrchestration()
        } else {
            updateCurrentOutput(
                <>
                    {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                    <Alert
                        type="error"
                        description={failureMessage}
                        showIcon={true}
                        closable={false}
                        style={{fontSize: "large", marginBottom: "1rem"}}
                    />
                </>
            )
            endOrchestration()
        }
    }

    const experimentGeneratedMessage = () => (
        <>
            Your new experiment has been generated. Click{" "}
            <a
                id="new-project-link"
                target="_blank"
                href={projectUrl.current}
                rel="noreferrer"
            >
                here
            </a>{" "}
            to view it.
        </>
    )

    useEffect(() => {
        // Poll the agent for logs when the Orchestration Agent is being used
        function pollAgent() {
            // Kick off the polling process
            logPollingIntervalId.current = setInterval(async () => {
                if (isAwaitingLlmRef.current) {
                    // Already a request in progress
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

                    // Check status from agents
                    // Any status other than "FOUND" means something went wrong
                    if (response.status !== AgentStatus.FOUND) {
                        const baseMessage = "Error occurred: session not found."
                        retry(
                            `${baseMessage} Retrying...`,
                            `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`
                        )

                        return
                    }

                    // Check for new logs
                    const hasNewLogs = response?.logs?.length > 0 && response.logs.length > lastLogIndexRef.current + 1
                    if (hasNewLogs) {
                        // Get new logs
                        const newLogs = response.logs.slice(lastLogIndexRef.current + 1)

                        // Update last log time
                        lastLogTime.current = Date.now()

                        // Update last log index
                        lastLogIndexRef.current = response.logs.length - 1

                        // Process new logs and display summaries to user
                        for (const logLine of newLogs) {
                            // extract the part of the line only up to LOGS_DELIMITER
                            const logLineElements = logLine.split(LOGS_DELIMITER)

                            const logLineSummary = logLineElements[0]
                            const summarySentenceCase = logLineSummary.replace(/\w+/gu, capitalize)

                            const logLineDetails = logLineElements[1]

                            let repairedJson: string | object = null

                            try {
                                // Attempt to parse as JSON

                                // First, repair it
                                repairedJson = jsonrepair(logLineDetails)

                                // Now try to parse it
                                repairedJson = JSON.parse(repairedJson)
                            } catch (e) {
                                // Not valid JSON
                                repairedJson = null
                            }

                            const section = (
                                <>
                                    {/*eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                                    <Collapse>
                                        <Panel
                                            id={`${summarySentenceCase}-panel`}
                                            header={summarySentenceCase}
                                            key={summarySentenceCase}
                                            style={{fontSize: "large"}}
                                        >
                                            <p id={`${summarySentenceCase}-details`}>
                                                {repairedJson ? (
                                                    <SyntaxHighlighter
                                                        id="syntax-highlighter"
                                                        language="json"
                                                        style={highlighterTheme}
                                                        showLineNumbers={false}
                                                        wrapLines={true}
                                                    >
                                                        {JSON.stringify(repairedJson, null, 2)}
                                                    </SyntaxHighlighter>
                                                ) : (
                                                    logLineDetails || "No further details"
                                                )}
                                            </p>
                                        </Panel>
                                    </Collapse>
                                    <br id={`${summarySentenceCase}-br`} />
                                </>
                            )

                            updateCurrentOutput(section)
                        }
                    } else {
                        // No new logs, check if it's been too long since last log
                        const timeSinceLastLog = Date.now() - lastLogTime.current
                        const isTimeout = lastLogTime.current && timeSinceLastLog > MAX_AGENT_INACTIVITY_SECS * 1000
                        if (isTimeout) {
                            const baseMessage = "Error occurred: exceeded wait time for agent response."
                            retry(
                                `${baseMessage} Retrying...`,
                                `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`
                            )
                            return
                        }
                    }

                    if (response.chatResponse) {
                        // Check for error
                        const errorMatches = AGENT_ERROR_REGEX.exec(response.chatResponse)
                        if (errorMatches) {
                            const baseMessage =
                                `Error occurred: ${errorMatches.groups.error}. ` +
                                `Traceback: ${errorMatches.groups.traceback}`
                            retry(
                                `${baseMessage} Retrying...`,
                                `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`
                            )

                            return
                        }

                        // Check for completion of orchestration by checking if response contains project info
                        const matches = AGENT_RESULT_REGEX.exec(response.chatResponse)

                        if (matches) {
                            // Build the URl and set it in state so the notification will be displayed
                            const projectId = matches.groups.projectId
                            const experimentId = matches.groups.experimentId

                            projectUrl.current = `/projects/${projectId}/experiments/${experimentId}/?generated=true`

                            // We found the agent completion message
                            updateCurrentOutput(
                                <>
                                    {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                                    <Collapse>
                                        <Panel
                                            id="experiment-generation-complete-panel"
                                            header="Experiment generation complete"
                                            key="Experiment generation complete"
                                            style={{fontSize: "large"}}
                                        >
                                            <p id="experiment-generation-complete-details">
                                                {experimentGeneratedMessage()}
                                            </p>
                                        </Panel>
                                    </Collapse>
                                    <br id="experiment-generation-complete-br" />
                                </>
                            )
                            endOrchestration()
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
            // We have a session ID, so we're in the orchestration process. Start polling the agents for logs.
            // Set last log time to now() to have something to compare to when we start polling for logs
            lastLogTime.current = Date.now()
            return pollAgent()
        } else {
            return undefined
        }
    }, [sessionId.current])

    /**
     * Handles adding content to the output window.
     * @param node A ReactNode to add to the output window -- text, spinner, etc.
     */
    function updateCurrentOutput(node: ReactNode) {
        console.debug("Adding to output:'", node, "' type: ", typeof node)

        setCurrentResponse((tmpCurrentResponse) => [...tmpCurrentResponse, node])

        // Auto scroll as response is generated
        if (autoScrollEnabledRef.current) {
            // Use setTimeout to ensure that the scroll happens after the new content is rendered
            setTimeout(() => {
                chatOutputRef.current.scrollTop = chatOutputRef.current.scrollHeight
            }, 0)
        }
    }

    function resetState() {
        // Reset state, whatever happened during request
        setIsAwaitingLlm(false)
        clearInput()

        previousResponse.current[selectedAgent] = currentResponse
        currentResponseRef.current = []
        setCurrentResponse([])
    }

    // Sends user query to backend.
    async function sendQuery(userQuery: string) {
        try {
            // Record user query in chat history
            chatHistory.current = [...chatHistory.current, new HumanMessage(userQuery)]

            setPreviousUserQuery(userQuery)

            setIsAwaitingLlm(true)

            // Always start output by echoing user query. Precede with a horizontal rule if there is already content.
            updateCurrentOutput(`${chatOutput?.length > 0 ? "---\n" : ""}##### Query\n${userQuery}\n##### Response\n`)

            const abortController = new AbortController()
            controller.current = abortController

            // If it's the orchestration process, we need to handle the query differently
            if (selectedAgent === "OrchestrationAgent") {
                await initiateOrchestration()
            } else {
                // Record organization name if current agent is OpportunityFinder. This is risky as the user may
                // have had a back-and-forth with the OpportunityFinder agent, but we'll assume that the last
                // query was the organization name.
                if (selectedAgent === "OpportunityFinder") {
                    inputOrganization.current = userQuery
                }

                // Send the query to the server. Response will be streamed to our callback which updates the output
                // display as tokens are received.
                await sendOpportunityFinderRequest(
                    userQuery,
                    selectedAgent,
                    updateCurrentOutput,
                    abortController.signal,
                    chatHistory.current
                )
            }

            // Add a blank line after response
            updateCurrentOutput("\n")

            // Add current output to aggregated output
            const formattedCurrentOutput = getFormattedCurrentOutput(currentResponseRef.current)
            setChatOutput([...chatOutput, formattedCurrentOutput])

            // Record bot answer in history.
            if (currentResponse && currentResponse.length > 0) {
                chatHistory.current = [...chatHistory.current, new AIMessage(nodesToString(currentResponse))]
            }
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                updateCurrentOutput("\n\nRequest cancelled.\n\n")
            } else {
                // Add error to output
                updateCurrentOutput(`\n\nError occurred: ${error}\n\n`)

                // log error to console
                console.error(error)
            }
        } finally {
            resetState()
        }
    }

    function handleStop() {
        try {
            controller?.current?.abort()
            controller.current = null
        } finally {
            resetState()
            endOrchestration()
        }
    }

    // Determine if awaiting response from any of the agents
    const orchestrationInProgress = sessionId.current != null
    const awaitingResponse = isAwaitingLlm || orchestrationInProgress

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !chatInput || chatInput.length === 0 || hasOnlyWhitespace(chatInput)

    // Disable Send when request is in progress
    const shouldDisableSendButton = userInputEmpty || awaitingResponse

    // Disable Send when request is in progress
    const shouldDisableRegenerateButton = !previousUserQuery || awaitingResponse

    // Width for the various buttons -- "regenerate", "stop" etc.
    const actionButtonWidth = 126

    // Disable Clear Chat button if there is no chat history or if we are awaiting a response
    const disableClearChatButton = awaitingResponse || chatOutput.length === 0

    // Define styles based on state
    const divStyle: CSSProperties = {
        whiteSpace: shouldWrapOutput ? "normal" : "nowrap",
        overflow: shouldWrapOutput ? "visible" : "hidden",
        textOverflow: shouldWrapOutput ? "clip" : "ellipsis",
        overflowX: shouldWrapOutput ? "visible" : "auto",
    }

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
     * Initiate the orchestration process. Sends the initial chat query to initiate the session, and saves the resulting
     * session ID in a ref for later use.
     *
     * @returns Nothing, but sets the session ID for the orchestration process
     */
    async function initiateOrchestration() {
        // Reset project URL
        projectUrl.current = null

        // Reset attempt number
        orchestrationAttemptNumber.current += 1

        // Set up the abort controller
        const abortController = new AbortController()
        controller.current = abortController

        // The input to Orchestration is the organization name, if we have it, plus the Python code that generates
        // the data.
        const orchestrationQuery =
            (inputOrganization.current ? `Organization in question: ${inputOrganization.current}\n` : "") +
            previousResponse.current.DataGenerator

        try {
            // Send the initial chat query to the server.
            const response: ChatResponse = await sendChatQuery(abortController.signal, orchestrationQuery, currentUser)

            // We expect the response to have status CREATED and to contain the session ID
            if (response.status !== AgentStatus.CREATED || !response.sessionId) {
                updateCurrentOutput(`\n\nError occurred: ${response.status}\n\n`)
                endOrchestration()
            } else {
                sessionId.current = response.sessionId
            }
        } catch (e) {
            updateCurrentOutput(`\n\nError occurred: ${e}\n\n`)
            endOrchestration()
        }
    }

    /**
     * Generate the agent buttons
     * @returns A div containing the agent buttons
     */
    function getAgentButtons() {
        const enableOrchestration = previousResponse.current.DataGenerator?.length > 0 && !awaitingResponse

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

    // Add a spinner if we're awaiting a response and there isn't one already
    // const currentOutputWithSpinner = [...currentResponse]
    // if (
    //     awaitingResponse &&
    //     !currentOutput.find((item) => typeof item === "object" && "id" in item
    //     && item.id === "awaitingOutputSpinner")
    // ) {
    //     currentOutput.push([
    //         <div
    //             id="awaitingOutputContainer"
    //             key="awaitingOutputContainer"
    //             style={{display: "flex", alignItems: "center", fontSize: "smaller"}}
    //         >
    //             <span
    //                 id="working-span"
    //                 style={{marginRight: "1rem"}}
    //             >
    //                 Working...
    //             </span>
    //             <ClipLoader
    //                 id="awaitingOutputSpinner"
    //                 key="awaitingOutputSpinner"
    //                 size="1rem"
    //             />
    //         </div>,
    //     ])
    // }

    // console.debug("***************************************")
    // console.debug("Current response:", currentResponse)
    // console.debug("***************************************")

    // Render the component
    return (
        <Form
            id="user-query-form"
            onSubmit={async function (event: FormEvent<HTMLFormElement>) {
                // Prevent submitting form
                event.preventDefault()
                await sendQuery(chatInput)
            }}
            style={{marginBottom: "6rem"}}
        >
            {getAgentButtons()}
            <Form.Group>
                <div style={{margin: "10px", position: "relative"}}>
                    <Form.Label style={{marginRight: "1rem", marginBottom: "0.5rem"}}>Code/JSON theme:</Form.Label>
                    <Select
                        id="syntax-highlighter-select"
                        value={{label: selectedTheme, value: selectedTheme}}
                        styles={{
                            container: (provided) => ({
                                ...provided,
                                maxWidth: "350px",
                                marginBottom: "1rem",
                            }),
                        }}
                        onChange={(option) => setSelectedTheme(option.value)}
                        options={[
                            {
                                label: "HLJS Themes",
                                options: HLJS_THEMES.map((theme) => ({label: theme, value: theme})),
                            },
                            {
                                label: "Prism Themes",
                                options: PRISM_THEMES.map((theme) => ({label: theme, value: theme})),
                            },
                        ]}
                    />
                </div>
            </Form.Group>
            {projectUrl.current && (
                // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                <Alert
                    type="success"
                    message={experimentGeneratedMessage()}
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
                        {getFullResponse()}
                    </div>
                    <Button
                        id="clear-chat-button"
                        onClick={() => {
                            setChatOutput([])
                            chatHistory.current = []
                            setPreviousUserQuery("")
                            projectUrl.current = null
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
                        onClick={async (event) => {
                            event.preventDefault()
                            await sendQuery(previousUserQuery)
                        }}
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
    )
}

/**
 * See main function description.
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import {styled} from "@mui/material"
import {Alert, Collapse, Tooltip} from "antd"
import NextImage from "next/image"
import {CSSProperties, FormEvent, ReactElement, ReactNode, useEffect, useRef, useState} from "react"
import {Button, Form, InputGroup} from "react-bootstrap"
import {BsStopBtn, BsTrash} from "react-icons/bs"
import {FiRefreshCcw} from "react-icons/fi"
import {MdOutlineWrapText, MdVerticalAlignBottom} from "react-icons/md"
import Select from "react-select"
import ClipLoader from "react-spinners/ClipLoader"
import * as hljsStyles from "react-syntax-highlighter/dist/cjs/styles/hljs"
import * as prismStyles from "react-syntax-highlighter/dist/cjs/styles/prism"

import {AgentButtons} from "./Agentbuttons"
import {pollForLogs} from "./AgentChatHandling"
import {experimentGeneratedMessage} from "./common"
import {INLINE_ALERT_PROPERTIES} from "./const"
import {FormattedMarkdown} from "./FormattedMarkdown"
import {HLJS_THEMES, PRISM_THEMES} from "./SyntaxHighlighterThemes"
import {DEFAULT_USER_IMAGE, MaximumBlue} from "../../../const"
import {sendChatQuery} from "../../../controller/agent/agent"
import {sendOpportunityFinderRequest} from "../../../controller/opportunity_finder/opportunity_finder"
import {AgentStatus, ChatResponse} from "../../../generated/agent"
import {OpportunityFinderRequestType} from "../../../pages/api/gpt/opportunityFinder/types"
import {useAuthentication} from "../../../utils/authentication"
import {hasOnlyWhitespace} from "../../../utils/text"

const {Panel} = Collapse

// #region: Constants
// Interval for polling the agents for logs
const AGENT_POLL_INTERVAL_MS = 5_000

// Input text placeholders for each agent type
const AGENT_PLACEHOLDERS: Record<OpportunityFinderRequestType, string> = {
    OpportunityFinder: "Enter a business name such as Acme Corporation",
    ScopingAgent: "Scope the selected item",
    DataGenerator: "Generate 1500 rows",
    OrchestrationAgent: "Generate the experiment",
}
// #endregion: Constants

// #region: Styled Components
const UserQuery = styled("div")({
    display: "inline-flex",
    borderRadius: "10px",
    backgroundColor: "#fff",
    padding: "10px",
    marginLeft: "10px",
    verticalAlign: "bottom",
})
// #endregion: Styled Components

/**
 * This is the main module for the opportunity finder. It implements a page that allows the user to interact with
 * an LLM to discover opportunities for a business, to scope them out, generate synthetic data, and even finally to
 * generate a project and experiment, all automatically.
 */
export function OpportunityFinder(): ReactElement {
    // Theme for syntax highlighter
    const [selectedTheme, setSelectedTheme] = useState<string>("vs")

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
        user: {image: userImage, name: currentUser},
    } = useAuthentication().data

    // Session ID for orchestration. We also use this as an overall "orchestration is in process" flag. If we have a
    // session ID, we are in the orchestration process.
    const sessionId = useRef<string>(null)

    // For newly created project/experiment URL
    const projectUrl = useRef<URL | null>(null)

    // To track time of last new logs from agents
    const lastLogTime = useRef<number | null>(null)

    // ID for log polling interval timer
    const logPollingIntervalId = useRef<ReturnType<typeof setInterval> | null>(null)

    // dynamic import syntax highlighter style based on selected theme
    const highlighterTheme = HLJS_THEMES.includes(selectedTheme)
        ? hljsStyles[selectedTheme]
        : prismStyles[selectedTheme]

    // Orchestration retry count. Bootstrap with 0; we increment this each time we retry the orchestration process.
    const orchestrationAttemptNumber = useRef<number>(0)

    // Define styles based on user options (wrap setting)
    const divStyle: CSSProperties = {
        whiteSpace: shouldWrapOutput ? "normal" : "nowrap",
        overflow: shouldWrapOutput ? "visible" : "hidden",
        textOverflow: shouldWrapOutput ? "clip" : "ellipsis",
        overflowX: shouldWrapOutput ? "visible" : "auto",
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

    // Auto scroll chat output window when new content is added
    useEffect(() => {
        if (autoScrollEnabledRef.current && chatOutputRef?.current) {
            chatOutputRef.current.scrollTop = chatOutputRef.current.scrollHeight
        }
    }, [chatOutput])

    async function pollAgent() {
        await pollForLogs(
            currentUser,
            sessionId.current,
            {
                lastLogIndex: lastLogIndexRef.current,
                setLastLogIndex: (index) => (lastLogIndexRef.current = index),
                lastLogTime: lastLogTime.current,
                setLastLogTime: (time) => (lastLogTime.current = time),
            },
            {
                orchestrationAttemptNumber: orchestrationAttemptNumber.current,
                initiateOrchestration,
                endOrchestration,
            },
            {
                isAwaitingLlm: isAwaitingLlmRef.current,
                setIsAwaitingLlm,
                signal: controller.current?.signal,
            },
            (url) => (projectUrl.current = url),
            updateOutput,
            highlighterTheme
        )
    }

    // Poll the agent for logs when the Orchestration Agent is being used
    useEffect(() => {
        if (sessionId.current) {
            // We have a session ID, so we're in the orchestration process. Start polling the agents for logs.
            // Set last log time to now() to have something to compare to when we start polling for logs
            lastLogTime.current = Date.now()

            // Kick off the polling process
            logPollingIntervalId.current = setInterval(pollAgent, AGENT_POLL_INTERVAL_MS)

            // Cleanup function to clear the interval
            return () => {
                if (logPollingIntervalId.current) {
                    clearInterval(logPollingIntervalId.current)
                    logPollingIntervalId.current = null
                }
            }
        } else {
            return undefined
        }
    }, [sessionId.current])

    /**
     * Handles adding content to the output window.
     * @param node A ReactNode to add to the output window -- text, spinner, etc.
     * @returns Nothing, but updates the output window with the new content
     */
    function updateOutput(node: ReactNode) {
        // Auto scroll as response is generated
        currentResponse.current += node
        setChatOutput((currentOutput) => [...currentOutput, node])
    }

    /**
     * End the orchestration process. Resets state in preparation for next orchestration.
     */
    const endOrchestration = () => {
        clearInterval(logPollingIntervalId.current)
        setIsAwaitingLlm(false)
        sessionId.current = null
        lastLogIndexRef.current = -1
        lastLogTime.current = null
    }

    /**
     * Reset the state of the component. This is called after a request is completed, regardless of success or failure.
     */
    const resetState = () => {
        // Reset state, whatever happened during request
        setIsAwaitingLlm(false)
        setChatInput("")

        previousResponse.current[selectedAgent] = currentResponse.current
        currentResponse.current = ""
    }

    const getUserImageAndUserQuery = (userQuery: string): ReactElement => (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        <div className="mb-4">
            {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
            <div className="inline-flex">
                <NextImage
                    id="user-image"
                    src={userImage || DEFAULT_USER_IMAGE}
                    width={30}
                    height={30}
                    title={currentUser}
                    alt=""
                    unoptimized={true}
                />
            </div>
            {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
            <UserQuery>{userQuery}</UserQuery>
        </div>
    )

    // Sends user query to backend.
    async function sendQuery(userQuery: string) {
        try {
            // Record user query in chat history
            chatHistory.current = [...chatHistory.current, new HumanMessage(userQuery)]

            setPreviousUserQuery(userQuery)

            setIsAwaitingLlm(true)

            // Always start output by echoing user query. Precede with a horizontal rule if there is already content.
            updateOutput(`${chatOutput?.length > 0 ? "\n---\n" : ""}##### Query\n`)
            updateOutput(getUserImageAndUserQuery(userQuery))
            updateOutput("\n\n##### Response\n")

            const abortController = new AbortController()
            controller.current = abortController

            // If it's the orchestration process, we need to handle the query differently
            if (selectedAgent === "OrchestrationAgent") {
                await initiateOrchestration(false)
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
                    updateOutput,
                    abortController.signal,
                    chatHistory.current
                )
            }

            // Add a blank line after response
            updateOutput("\n")

            // Record bot answer in history.
            if (currentResponse?.current?.length > 0) {
                chatHistory.current = [...chatHistory.current, new AIMessage(currentResponse.current)]
            }
        } catch (error) {
            const isAbortError = error instanceof Error && error.name === "AbortError"

            if (error instanceof Error) {
                // AbortErrors are handled elsewhere
                if (!isAbortError) {
                    updateOutput(
                        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                        <Alert
                            {...INLINE_ALERT_PROPERTIES}
                            type="error"
                            message={`Error occurred: ${error}`}
                        />
                    )

                    // log error to console
                    console.error(error)
                }
            }
        } finally {
            resetState()
        }
    }

    function handleStop() {
        try {
            controller?.current?.abort()
            controller.current = null
            updateOutput(
                // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                <Alert
                    {...INLINE_ALERT_PROPERTIES}
                    type="warning"
                    message="Request cancelled."
                />
            )
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

    /**
     * Initiate the orchestration process. Sends the initial chat query to initiate the session, and saves the resulting
     * session ID in a ref for later use.
     *
     * @param isRetry Whether this is a retry of the orchestration process or the first attempt initiated by user
     * @returns Nothing, but sets the session ID for the orchestration process
     */
    async function initiateOrchestration(isRetry: boolean) {
        // Reset project URL
        projectUrl.current = null

        if (isRetry) {
            // Increment attempt number
            orchestrationAttemptNumber.current += 1
        } else {
            // Reset attempt number
            orchestrationAttemptNumber.current = 1
        }

        // Set up the abort controller
        const abortController = new AbortController()
        controller.current = abortController

        // The input to Orchestration is the organization name, if we have it, plus the Python code that generates
        // the data.
        const orchestrationQuery =
            (inputOrganization.current ? `Organization in question: ${inputOrganization.current}\n` : "") +
            previousResponse.current.DataGenerator

        updateOutput(
            <>
                {/*eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <Collapse style={{marginBottom: "1rem"}}>
                    <Panel
                        id="initiating-orchestration-panel"
                        header="Contacting orchestration agents..."
                        key="initiating-orchestration-panel"
                        style={{fontSize: "large"}}
                    >
                        <p id="initiating-orchestration-details">{`Query: ${orchestrationQuery}`}</p>
                    </Panel>
                </Collapse>
            </>
        )

        try {
            setIsAwaitingLlm(true)

            // Send the initial chat query to the server.
            const response: ChatResponse = await sendChatQuery(abortController.signal, orchestrationQuery, currentUser)

            // We expect the response to have status CREATED and to contain the session ID
            if (response.status !== AgentStatus.CREATED || !response.sessionId) {
                updateOutput(
                    // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                    <Alert
                        {...INLINE_ALERT_PROPERTIES}
                        type="error"
                        message={`Error occurred: session not created. Status: ${response.status}`}
                    />
                )

                endOrchestration()
            } else {
                sessionId.current = response.sessionId
            }
        } catch (e) {
            updateOutput(
                // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                <Alert
                    {...INLINE_ALERT_PROPERTIES}
                    type="error"
                    message={`Internal Error occurred while interacting with agents. Exception: ${e}`}
                />
            )
            endOrchestration()
        } finally {
            setIsAwaitingLlm(false)
        }
    }

    const enableOrchestration = previousResponse?.current?.DataGenerator?.length > 0 && !awaitingResponse

    // Render the component
    return (
        <Form
            id="user-query-form"
            onSubmit={async function (event: FormEvent<HTMLFormElement>) {
                // Prevent submitting form
                event.preventDefault()
                await sendQuery(chatInput)
            }}
            style={{marginBottom: "6rem", paddingBottom: "15px"}}
        >
            <AgentButtons
                id="opp-finder-agent-buttons"
                enableOrchestration={enableOrchestration}
                awaitingResponse={awaitingResponse}
                selectedAgent={selectedAgent}
                setSelectedAgent={setSelectedAgent}
            />
            <Form.Group
                id="select-theme-group"
                style={{fontSize: "0.9rem", margin: "10px", position: "relative"}}
            >
                <Form.Label
                    id="select-theme-label"
                    style={{marginRight: "1rem", marginBottom: "0.5rem"}}
                >
                    Code/JSON theme:
                </Form.Label>
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
            </Form.Group>
            {projectUrl.current && (
                // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                <Alert
                    type="success"
                    message={experimentGeneratedMessage(projectUrl.current)}
                    style={{fontSize: "large", margin: "10px", marginTop: "20px", marginBottom: "20px"}}
                    showIcon={true}
                    closable={true}
                />
            )}
            <Form.Group id="llm-chat-group">
                <div
                    id="llm-response-div"
                    style={{...divStyle, height: "50vh", margin: "10px", position: "relative"}}
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
                        {chatOutput && chatOutput.length > 0 ? (
                            <FormattedMarkdown
                                id="formatted-markdown"
                                nodesList={chatOutput}
                                style={highlighterTheme}
                            />
                        ) : (
                            "(Agent output will appear here)"
                        )}
                        {awaitingResponse && (
                            <div
                                id="awaitingOutputContainer"
                                style={{display: "flex", alignItems: "center", fontSize: "smaller"}}
                            >
                                <span
                                    id="working-span"
                                    style={{marginRight: "1rem"}}
                                >
                                    Working...
                                </span>
                                <ClipLoader
                                    id="awaitingOutputSpinner"
                                    size="1rem"
                                />
                            </div>
                        )}
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
                                height: "47px",
                                marginLeft: "10px",
                            }}
                            onChange={(event) => {
                                setChatInput(event.target.value)
                            }}
                            value={chatInput}
                        />
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
                    </div>
                </div>
            </Form.Group>
        </Form>
    )
}

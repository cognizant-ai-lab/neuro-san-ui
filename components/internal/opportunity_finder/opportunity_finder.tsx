/**
 * See main function description.
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import {DeleteOutline, Loop, StopCircle} from "@mui/icons-material"
import {Box, Button, CircularProgress, FormControl, FormGroup, FormLabel, Input, MenuItem, styled} from "@mui/material"
import Select from "@mui/material/Select"
import Tooltip from "@mui/material/Tooltip"
import {Collapse} from "antd"
import NextImage from "next/image"
import {CSSProperties, ReactElement, ReactNode, useEffect, useRef, useState} from "react"
import {MdCode, MdOutlineWrapText, MdVerticalAlignBottom} from "react-icons/md"
import * as hljsStyles from "react-syntax-highlighter/dist/cjs/styles/hljs"
import * as prismStyles from "react-syntax-highlighter/dist/cjs/styles/prism"

import {AgentButtons} from "./Agentbuttons"
import {pollForLogs} from "./AgentChatHandling"
import {experimentGeneratedMessage} from "./common"
import {FormattedMarkdown} from "./FormattedMarkdown"
import {HLJS_THEMES, PRISM_THEMES} from "./SyntaxHighlighterThemes"
import {DEFAULT_USER_IMAGE, SecondaryBlue} from "../../../const"
import {sendChatQuery} from "../../../controller/agent/agent"
import {sendOpportunityFinderRequest} from "../../../controller/opportunity_finder/fetch"
import {AgentStatus, ChatResponse} from "../../../generated/neuro_san/api/grpc/agent"
import {OpportunityFinderRequestType} from "../../../pages/api/gpt/opportunityFinder/types"
import {useAuthentication} from "../../../utils/authentication"
import {hasOnlyWhitespace} from "../../../utils/text"
import {getTitleBase} from "../../../utils/title"
import {MUIAlert} from "../../MUIAlert"
import {LlmChatButton} from "../LlmChatButton"
import {LlmChatOptionsButton} from "../LlmChatOptionsButton"

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

const UserQueryContainer = styled("div")({
    backgroundColor: "#FFF",
    borderRadius: "8px",
    boxShadow: "0 0px 2px 0 rgba(0, 0, 0, 0.15)",
    display: "inline-flex",
    padding: "10px",
})

// #endregion: Styled Components

/**
 * This is the main module for the opportunity finder. It implements a page that allows the user to interact with
 * an LLM to discover opportunities for a business, to scope them out, generate synthetic data, and even finally to
 * generate a project and experiment, all automatically.
 */
export function OpportunityFinder(): ReactElement {
    // Theme for syntax highlighter
    const [selectedTheme, setSelectedTheme] = useState<string>("a11yDark")

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

    // A button allows the user to enable or disable the "Code/JSON theme" dropdown.
    const [codeJsonThemeEnabled, setCodeJsonThemeEnabled] = useState<boolean>(true)

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

    const isDataGenerator = selectedAgent === "DataGenerator"

    // Sync ref with state variable for use within timer etc.
    useEffect(() => {
        isAwaitingLlmRef.current = isAwaitingLlm
    }, [isAwaitingLlm])

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
        <div style={{marginBottom: "1rem"}}>
            {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
            <UserQueryContainer>
                <NextImage
                    id="user-query-image"
                    src={userImage || DEFAULT_USER_IMAGE}
                    width={30}
                    height={30}
                    title={currentUser}
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
            resetState()
        }
    }

    function handleStop() {
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
            endOrchestration()
        }
    }

    // Determine if awaiting response from any of the agents
    const orchestrationInProgress = sessionId.current != null
    const awaitingResponse = isAwaitingLlm || orchestrationInProgress

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !chatInput || chatInput.length === 0 || hasOnlyWhitespace(chatInput)

    // Enable Send button when there is user input and not awaiting a response
    const shouldEnableSendButton = !userInputEmpty && !awaitingResponse

    // Enable regenerate button when there is a previous query to resent, and we're not awaiting a response
    const shouldEnableRegenerateButton = previousUserQuery && !awaitingResponse

    // Enable Clear Chat button if not awaiting response and there is chat output to clear
    const enableClearChatButton = !awaitingResponse && chatOutput.length > 0

    const SYNTAX_THEMES = [
        {
            label: "HLJS Themes",
            options: HLJS_THEMES,
        },
        {
            label: "Prism Themes",
            options: PRISM_THEMES,
        },
    ]

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
                    <MUIAlert
                        id="opp-finder-error-occurred-session-not-created-alert"
                        severity="error"
                    >
                        {`Error occurred: session not created. Status: ${response.status}`}
                    </MUIAlert>
                )

                endOrchestration()
            } else {
                sessionId.current = response.sessionId
            }
        } catch (e) {
            updateOutput(
                <MUIAlert
                    id="opp-finder-error-occurred-while-interacting-with-agents-alert"
                    severity="error"
                >
                    {`Internal Error occurred while interacting with agents. Exception: ${e}`}
                </MUIAlert>
            )
            endOrchestration()
        } finally {
            setIsAwaitingLlm(false)
        }
    }

    const enableOrchestration = previousResponse?.current?.DataGenerator?.length > 0 && !awaitingResponse

    // Render the component
    return (
        <Box
            id="user-query-form"
            sx={{marginBottom: "6rem", paddingBottom: "15px"}}
        >
            <AgentButtons
                id="opp-finder-agent-buttons"
                enableOrchestration={enableOrchestration}
                awaitingResponse={awaitingResponse}
                selectedAgent={selectedAgent}
                setSelectedAgent={setSelectedAgent}
            />
            {isDataGenerator && codeJsonThemeEnabled && (
                <FormGroup
                    id="select-theme-group"
                    sx={{fontSize: "0.9rem", margin: "10px", position: "relative"}}
                >
                    <FormLabel
                        id="select-theme-label"
                        style={{marginRight: "1rem", marginBottom: "0.5rem"}}
                    >
                        Code/JSON theme:
                    </FormLabel>
                    <FormControl
                        id="syntax-highlighter-select-form-control"
                        sx={{display: "block"}}
                    >
                        <Select
                            id="syntax-highlighter-select"
                            value={selectedTheme}
                            sx={{
                                width: "350px",
                                marginBottom: "1rem",
                            }}
                            MenuProps={{
                                slotProps: {
                                    paper: {
                                        style: {
                                            maxHeight: "350px",
                                        },
                                    },
                                },
                            }}
                            onChange={(event) => setSelectedTheme(event.target.value)}
                        >
                            {SYNTAX_THEMES.map((theme) =>
                                Object.keys(theme).map((themeKey) => {
                                    if (themeKey === "label") {
                                        return (
                                            <MenuItem // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                                id={`syntax-highlighter-select-${theme.label}`}
                                                key={theme.label}
                                                disabled
                                                value=""
                                            >
                                                {theme.label}
                                            </MenuItem>
                                        )
                                    } else {
                                        return theme[themeKey].map((syntaxTheme) => (
                                            <MenuItem
                                                id={`syntax-highlighter-select-${syntaxTheme}`}
                                                key={syntaxTheme}
                                                value={syntaxTheme}
                                            >
                                                {syntaxTheme}
                                            </MenuItem>
                                        ))
                                    }
                                })
                            )}
                        </Select>
                    </FormControl>
                </FormGroup>
            )}
            {projectUrl.current && (
                <MUIAlert
                    closeable={true}
                    id="opp-finder-experiment-generated-alert"
                    severity="success"
                    sx={{
                        marginLeft: "0.5rem",
                        marginRight: "0.5rem",
                        marginTop: "1rem",
                    }}
                >
                    {experimentGeneratedMessage(projectUrl.current)}
                </MUIAlert>
            )}
            <Box id="llm-chat-group">
                <Box
                    id="llm-response-div"
                    sx={{...divStyle, height: "50vh", margin: "10px", position: "relative"}}
                >
                    {isDataGenerator && (
                        <Tooltip
                            id="enable-code-json-theme-dropdown"
                            title={`Customize code/JSON theme ${codeJsonThemeEnabled ? "enabled" : "disabled"}`}
                        >
                            <LlmChatOptionsButton
                                enabled={codeJsonThemeEnabled}
                                id="autoscroll-code-json-theme"
                                onClick={() => setCodeJsonThemeEnabled(!codeJsonThemeEnabled)}
                                posRight={150}
                            >
                                <MdCode
                                    id="code-icon"
                                    size="15px"
                                    style={{color: "white"}}
                                />
                            </LlmChatOptionsButton>
                        </Tooltip>
                    )}
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
                            backgroundColor: SecondaryBlue,
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

                    {/*Clear Chat button*/}
                    {!awaitingResponse && (
                        <LlmChatButton
                            id="clear-chat-button"
                            onClick={() => {
                                setChatOutput([])
                                chatHistory.current = []
                                setPreviousUserQuery("")
                                projectUrl.current = null
                            }}
                            disabled={!enableClearChatButton}
                            posRight={145}
                            posBottom={10}
                            sx={{
                                position: "absolute",
                            }}
                        >
                            <DeleteOutline
                                id="stop-button-icon"
                                sx={{marginRight: "0.25rem", display: "inline"}}
                            />
                            Clear Chat
                        </LlmChatButton>
                    )}

                    {/*Stop Button*/}
                    {awaitingResponse && (
                        <LlmChatButton
                            id="stop-output-button"
                            onClick={() => handleStop()}
                            posRight={10}
                            posBottom={10}
                            disabled={!awaitingResponse}
                            sx={{
                                position: "absolute",
                            }}
                        >
                            <StopCircle
                                id="stop-button-icon"
                                sx={{display: "inline", marginRight: "0.5rem"}}
                            />
                            Stop
                        </LlmChatButton>
                    )}

                    {/*Regenerate Button*/}
                    {!awaitingResponse && (
                        <LlmChatButton
                            id="regenerate-output-button"
                            onClick={async (event) => {
                                event.preventDefault()
                                await sendQuery(previousUserQuery)
                            }}
                            posRight={10}
                            posBottom={10}
                            disabled={!shouldEnableRegenerateButton}
                            sx={{
                                position: "absolute",
                            }}
                        >
                            <Loop
                                id="generate-icon"
                                sx={{display: "inline", marginRight: "0.25rem"}}
                            />
                            Regenerate
                        </LlmChatButton>
                    )}
                </Box>
                <Box
                    id="user-input-div"
                    style={{...divStyle, display: "flex", margin: "10px", alignItems: "center", position: "relative"}}
                >
                    <Input
                        id="user-input"
                        placeholder={AGENT_PLACEHOLDERS[selectedAgent]}
                        ref={chatInputRef}
                        sx={{
                            display: "flex",
                            flexGrow: 1,
                            marginRight: "10px",
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
                            left: "calc(100% - 180px)",
                            lineHeight: "35px",
                            opacity: userInputEmpty ? "25%" : "100%",
                            position: "absolute",
                            zIndex: 99999,
                        }}
                        disabled={userInputEmpty}
                        tabIndex={-1}
                    >
                        X
                    </Button>

                    {/*Send Button*/}
                    <LlmChatButton
                        id="submit-query-button"
                        type="submit"
                        posBottom={0}
                        disabled={!shouldEnableSendButton}
                        sx={{
                            opacity: shouldEnableSendButton ? "100%" : "50%",
                        }}
                        onClick={async () => {
                            await sendQuery(chatInput)
                        }}
                    >
                        Send
                    </LlmChatButton>
                </Box>
            </Box>
        </Box>
    )
}

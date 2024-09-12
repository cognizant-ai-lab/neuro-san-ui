/**
 * This is the module for the "AI decision assistant".
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import {Tooltip} from "antd"
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
import {sendDecisionAssistantQuery} from "../../../controller/decisionAssistant/decisionAssistant"
import {sendOpportunityFinderRequest} from "../../../controller/opportunity_finder/opportunity_finder"
import {OpportunityFinderRequestType} from "../../../pages/api/gpt/opportunityFinder/types"
import {useAuthentication} from "../../../utils/authentication"
import {hasOnlyWhitespace} from "../../../utils/text"
import BlankLines from "../../blanklines"

/**
 * AI assistant, initially for DMS page but in theory could be used elsewhere. Allows the user to chat with an LLM
 * (via the backend) with full context about the current DMS page, in a question-and-answer chat format.
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

    function clearInput() {
        setUserLlmChatInput("")
    }

    useEffect(() => {
        // Delay for a second before focusing on the input area; gets around ChatBot stealing focus.
        setTimeout(() => {
            inputAreaRef?.current?.focus()
        }, 1000)
    }, [])

    /**
     * Handles a token received from the LLM via callback on the fetch request.
     * @param token The token received from the LLM
     */
    function tokenReceivedHandler(token: string) {
        // Auto scroll as response is generated
        if (llmOutputTextAreaRef.current && autoScrollEnabled.current) {
            isProgrammaticScroll.current = true
            llmOutputTextAreaRef.current.scrollTop = llmOutputTextAreaRef.current.scrollHeight
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

            // Send the query to the server. Response will be streamed to our callback which updates the output
            // display as tokens are received.
            await sendOpportunityFinderRequest(
                userQuery,
                selectedAgent,
                tokenReceivedHandler,
                abortController.signal,
                chatHistory.current
            )

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

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !userLlmChatInput || userLlmChatInput.length === 0 || hasOnlyWhitespace(userLlmChatInput)

    // Disable Send when request is in progress
    const shouldDisableSendButton = userInputEmpty || isAwaitingLlm

    // Disable Send when request is in progress
    const shouldDisableRegenerateButton = !previousUserQuery || isAwaitingLlm

    // Width for the various buttons -- "regenerate", "stop" etc.
    const actionButtonWidth = 126

    const disableClearChatButton = isAwaitingLlm || userLlmChatOutput.length === 0

    /**
     * Get the class name for the agent button.
     * @param agentType The agent type, eg. "OpportunityFinder"
     * @returns The class name for the agent button
     */
    function getClassName(agentType: OpportunityFinderRequestType) {
        return `opp-finder-agent-div${selectedAgent === agentType ? " selected" : ""}`
    }

    function getStyle(): CSSProperties {
        return {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: isAwaitingLlm ? "none" : "auto",
            opacity: isAwaitingLlm ? 0.5 : 1,
        }
    }

    async function handleOrchestration() {
        console.debug("previous response", previousResponse.current)
        const abortController = new AbortController()
        controller.current = abortController

        const orchestrationQuery = `${previousResponse.current.ScopingAgent}\n${previousResponse.current.DataGenerator}`

        try {
            const res = await sendDecisionAssistantQuery(null, abortController.signal, orchestrationQuery, currentUser)
            console.debug("Orchestration response", res)
        } catch (e) {
            setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\nError occurred: ${e}\n\n`)
        }

        // window.open("/projects/2463/experiments/2526", "_blank").focus()
    }

    /**
     * Generate the agent buttons
     * @returns A div containing the agent buttons
     */
    function getAgentButtons() {
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
                    style={getStyle()}
                    onClick={() => setSelectedAgent("OpportunityFinder")}
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
                    style={getStyle()}
                    onClick={() => setSelectedAgent("ScopingAgent")}
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
                    style={getStyle()}
                    onClick={() => setSelectedAgent("DataGenerator")}
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
                <div
                    id="opp-finder-agent-div"
                    style={{...getStyle(), cursor: "pointer"}}
                    onClick={async () => {
                        await handleOrchestration()
                    }}
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
                                display: isAwaitingLlm ? "none" : "inline",
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
                                display: isAwaitingLlm ? "inline" : "none",
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
                                display: isAwaitingLlm ? "none" : "inline",
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
                            {isAwaitingLlm ? (
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

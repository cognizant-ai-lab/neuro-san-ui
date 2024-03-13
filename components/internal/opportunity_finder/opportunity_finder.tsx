/**
 * This is the module for the "AI decision assistant".
 */
import {FormEvent, useEffect, useRef, useState} from "react"
import {Button, Form, InputGroup} from "react-bootstrap"
import {Typeahead} from "react-bootstrap-typeahead"
import {BsStopBtn, BsTrash} from "react-icons/bs"
import {FiRefreshCcw} from "react-icons/fi"
import ClipLoader from "react-spinners/ClipLoader"

import {MaximumBlue} from "../../../const"
import {sendOpportunityFinderRequest} from "../../../controller/opportunity_finder/opportunity_finder"
import {OpportunityFinderRequestType} from "../../../pages/api/gpt/opportunityFinder/types"
import data from "../../../top_500.json"
import {hasOnlyWhitespace} from "../../../utils/text"
import BlankLines from "../../blanklines"

/**
 * AI assistant, initially for DMS page but in theory could be used elsewhere. Allows the user to chat with an LLM
 * (via the backend) with full context about the current DMS page, in a question-and-answer chat format.
 */
export function OpportunityFinder() {
    // Previous user query (for "regenerate" feature)
    const [previousUserQuery, setPreviousUserQuery] = useState<string>("")

    // User LLM chat output
    const [userLlmChatOutput, setUserLlmChatOutput] = useState<string>("")

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    // State for the typeahead
    const [selectedString, setSelectedString] = useState<string>("")

    // Has LLM already provided opportunities?
    const [hasOpportunities, setHasOpportunities] = useState(false)

    // Have we already generated data for an opportunity?
    const [hasGeneratedData, setHasGeneratedData] = useState(false)

    // Ref for output text area, so we can auto scroll it
    const llmOutputTextAreaRef = useRef(null)

    // Ref for user input text area, so we can handle shift-enter
    const inputAreaRef = useRef(null)

    // Controller for cancelling fetch request
    const controller = useRef<AbortController>(null)

    // To accumulate current response, which will be different than the contents of the output window if there is a
    // chat session
    const currentResponse = useRef<string>("")

    const itemButtonWidth = 40

    function getOptionButtons() {
        // Generate 5 buttons using an array for the range and map
        return (
            <div
                id="option-buttons-div"
                style={{
                    backgroundColor: "lightblue",
                    borderColor: MaximumBlue,
                    borderStyle: "solid",
                    borderRadius: "10000px",
                    borderWidth: "1px",
                    display: isAwaitingLlm ? "none" : "inline",
                    position: "absolute",
                    zIndex: 99999,
                    bottom: "1px",
                    padding: "20px",
                    marginLeft: "20px",
                    marginBottom: "10px",
                    opacity: "70%",
                }}
            >
                <span
                    id="title-span"
                    style={{textAlign: "center", verticalAlign: "middle"}}
                >
                    Decision point:
                </span>
                {Array.from(Array(5).keys()).map((i) => (
                    <Button
                        id={`option-${i}`}
                        key={i}
                        onClick={async () => {
                            setHasGeneratedData(true)
                            await sendQuery((i + 1).toString(), "DataGenerator", i + 1)
                        }}
                        disabled={isAwaitingLlm}
                        variant="outline-primary"
                        style={{
                            background: MaximumBlue,
                            borderColor: MaximumBlue,
                            bottom: 10,
                            color: "white",
                            fontSize: "13.3px",
                            opacity: "70%",
                            marginLeft: "10px",
                            marginTop: "10px",
                            width: itemButtonWidth,
                        }}
                    >
                        {i + 1}
                    </Button>
                ))}
            </div>
        )
    }

    function clearInput() {
        inputAreaRef?.current?.clear()
        setSelectedString("")
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
        if (llmOutputTextAreaRef.current) {
            llmOutputTextAreaRef.current.scrollTop = llmOutputTextAreaRef.current.scrollHeight
        }
        currentResponse.current += token
        setUserLlmChatOutput((currentOutput) => currentOutput + token)
    }

    // Sends user query to backend.
    async function sendQuery(userQuery: string, requestType: OpportunityFinderRequestType, optionNumber?: number) {
        try {
            setPreviousUserQuery(userQuery)

            setIsAwaitingLlm(true)

            // Always start output by echoing user query
            setUserLlmChatOutput((currentOutput) =>
                optionNumber == null
                    ? `${currentOutput}Company: ${userQuery}\n\nResponse:\n\n`
                    : `${currentOutput}Option selected: ${optionNumber}\n\nResponse:\n\n`
            )

            const abortController = new AbortController()
            controller.current = abortController

            // Send the query to the server. Response will be streamed to our callback which updates the output
            // display as tokens are received.
            await sendOpportunityFinderRequest(
                userQuery,
                requestType,
                tokenReceivedHandler,
                abortController.signal,
                optionNumber == null ? null : userLlmChatOutput,
                optionNumber
            )

            // Add a couple of blank lines after response
            setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\n\n\n`)
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === "AbortError") {
                    setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\nRequest cancelled.\n\n`)
                } else {
                    console.error(error.stack)
                }
            } else {
                setUserLlmChatOutput(
                    `Internal error: \n\n${error}\n More information may be available in the browser console.`
                )
            }
        } finally {
            // Reset state, whatever happened during request
            setIsAwaitingLlm(false)
            clearInput()
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
        setHasOpportunities(true)
        setHasGeneratedData(false)
        setUserLlmChatOutput("")
        await sendQuery(selectedString, "OpportunityFinder")
    }

    function handleStop() {
        try {
            controller?.current?.abort()
            controller.current = null
        } finally {
            setIsAwaitingLlm(false)
            clearInput()
            currentResponse.current = ""
            setHasOpportunities(false)
            setHasGeneratedData(false)
        }
    }

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !selectedString || selectedString.length === 0 || hasOnlyWhitespace(selectedString)

    // Disable Send when request is in progress
    const shouldDisableSendButton = userInputEmpty || isAwaitingLlm

    // Disable Send when request is in progress
    const shouldDisableRegenerateButton = !previousUserQuery || isAwaitingLlm

    // Width for the various buttons -- "regenerate", "stop" etc.
    const actionButtonWidth = 126

    const shouldShowOptionsButtons = hasOpportunities && !hasGeneratedData

    return (
        <>
            <Form
                id="user-query-form"
                onSubmit={handleUserQuery}
            >
                <Form.Group id="llm-chat-group">
                    <div
                        id="llm-response-div"
                        style={{height: "60vh", margin: "10px", position: "relative"}}
                    >
                        <Form.Control
                            id="llm-responses"
                            readOnly={true}
                            ref={llmOutputTextAreaRef}
                            as="textarea"
                            placeholder="(Opportunity Finder output will appear here)"
                            style={{
                                background: "ghostwhite",
                                borderColor: MaximumBlue,
                                fontFamily: "monospace",
                                fontSize: "smaller",
                                height: "100%",
                                resize: "none",
                                whiteSpace: "pre-wrap",
                            }}
                            tabIndex={-1}
                            value={userLlmChatOutput}
                        />
                        {shouldShowOptionsButtons && getOptionButtons()}
                        <Button
                            id="clear-chat-button"
                            onClick={() => {
                                setUserLlmChatOutput("")
                                setHasOpportunities(false)
                                setHasGeneratedData(false)
                            }}
                            variant="secondary"
                            style={{
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                bottom: 10,
                                color: "white",
                                display: isAwaitingLlm ? "none" : "inline",
                                fontSize: "13.3px",
                                opacity: "70%",
                                position: "absolute",
                                right: 145,
                                width: actionButtonWidth,
                                zIndex: 99999,
                            }}
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
                            onClick={() => sendQuery(previousUserQuery, "OpportunityFinder")}
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
                        id="user-input-div"
                        style={{display: "flex"}}
                    >
                        <InputGroup id="user-input-group">
                            <Typeahead
                                id="user-input"
                                allowNew={true}
                                minLength={2}
                                placeholder="Enter a single organization or company name, for example, IBM"
                                ref={inputAreaRef}
                                style={{
                                    fontSize: "90%",
                                    marginLeft: "7px",
                                }}
                                options={data.companies}
                                onInputChange={(text: string) => {
                                    setSelectedString(text)
                                }}
                                onChange={(selectedItems) => {
                                    if (selectedItems && selectedItems.length > 0) {
                                        const item = selectedItems[0]
                                        if (typeof item === "string") {
                                            setSelectedString(item)
                                        } else {
                                            setSelectedString(item.label)
                                        }
                                    }
                                }}
                                selected={[selectedString]}
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

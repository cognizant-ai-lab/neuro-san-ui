/**
 * This is the module for the "AI decision assistant".
 */
import {Drawer} from "antd"
import {ChatMessage} from "langchain/schema"
import {ChangeEvent, FormEvent, useRef, useState} from "react"
import {Button, Form, InputGroup} from "react-bootstrap"
import {BsStopBtn} from "react-icons/bs"
import {FiRefreshCcw} from "react-icons/fi"
import ClipLoader from "react-spinners/ClipLoader"

import {MaximumBlue} from "../../../const"
import {StringToStringOrNumber} from "../../../controller/base_types"
import {sendDmsChatQuery} from "../../../controller/dmschat/dmschat"
import {isEmptyExceptForWhitespace} from "../../../utils/text"

/**
 * AI assistant, initially for DMS page but in theory could be used elsewhere.
 */
export function AIAssistant(props: {
    predictorUrls: string[]
    prescriptorUrl: string
    contextInputs: StringToStringOrNumber
    onClose: () => void
    open: boolean
    resetUndeployModelsTimer: () => void
    projectName?: string
    projectDescription?: string
}) {
    // User LLM chat input
    const [userLlmChatInput, setUserLlmChatInput] = useState<string>("")

    // Previous user query (for "regenerate" feature)
    const [previousUserQuery, setPreviousUserQuery] = useState<string>("")

    // User LLM chat output
    const [userLlmChatOutput, setUserLlmChatOutput] = useState<string>("")

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    // Ref for output text area, so we can auto scroll it
    const llmOutputTextAreaRef = useRef(null)

    // Ref for user input text area, so we can handle shift-enter
    const inputAreaRef = useRef(null)

    // Controller for cancelling fetch request
    const controller = useRef<AbortController>(null)

    // Use useRef here since we don't want changes in the chat history to trigger a re-render
    const chatHistory = useRef<ChatMessage[]>([])

    // To accumulate current response, which will be different than the contents of the output window if there is a
    // chat session
    const currentResponse = useRef<string>("")

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

    function extractFinalAnswer(response: string) {
        return /Final Answer: .*/su.exec(response)
    }

    /**
     * Highlights the final answer in the LLM output.
     */
    function highlightFinalAnswer(response: string) {
        // Highlight final answer
        const llmOutputTextArea = llmOutputTextAreaRef.current
        if (llmOutputTextArea && response) {
            const llmOutputText = llmOutputTextArea.value
            const finalAnswerMatch = extractFinalAnswer(response)
            if (finalAnswerMatch && finalAnswerMatch.length > 0) {
                const finalAnswer = finalAnswerMatch[0]
                const finalAnswerIndex = llmOutputText.indexOf(finalAnswer)
                const finalAnswerLength = finalAnswer.length
                llmOutputTextArea.setSelectionRange(finalAnswerIndex, finalAnswerIndex + finalAnswerLength)
                llmOutputTextArea.focus()
            }
        }
    }

    // Sends user query to backend.
    async function sendQuery(userQuery: string) {
        try {
            // Record user query in chat history
            chatHistory.current = [...chatHistory.current, new ChatMessage(userQuery, "human")]

            setPreviousUserQuery(userQuery)

            // User interacted so reset timer
            props.resetUndeployModelsTimer()

            setIsAwaitingLlm(true)

            // Always start output by echoing user query
            setUserLlmChatOutput((currentOutput) => `${currentOutput}Query: ${userQuery}\n\nResponse:\n\n`)

            const abortController = new AbortController()
            controller.current = abortController

            // Send the query to the server. Response will be streamed to our callback which updates the output
            // display as tokens are received.
            await sendDmsChatQuery(
                userQuery,
                props.contextInputs,
                props.prescriptorUrl,
                props.predictorUrls,
                tokenReceivedHandler,
                abortController.signal,
                chatHistory.current,
                props.projectName,
                props.projectDescription
            )

            // Kick off highlighting final answer
            setTimeout(highlightFinalAnswer, 100, currentResponse.current)

            // Add a couple of blank lines after response
            setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\n`)

            // Record bot answer in history. Only record the final answer or we will end up using a crazy amount of
            // tokens.
            const finalAnswer = extractFinalAnswer(currentResponse.current)
            if (finalAnswer && finalAnswer.length > 0) {
                chatHistory.current = [...chatHistory.current, new ChatMessage(finalAnswer[0], "ai")]
            }
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === "AbortError") {
                    setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\nRequest cancelled.`)
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
            setUserLlmChatInput("")
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

    const handleInputAreaChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // Check if enter key was pressed. Seems a bit of a cheesy way to do it but couldn't find a better way in
        // this event handler, given what is passed as the Event.
        const isEnter = "inputType" in event.nativeEvent && event.nativeEvent.inputType === "insertLineBreak"

        // Enter key is handled by KeyUp handler, so ignore it here
        if (!isEnter) {
            const inputText = event.target.value
            setUserLlmChatInput(inputText)
        }
    }

    async function handleInputAreaKeyUp(event) {
        // If shift enter pressed, just add a newline. Otherwise, if enter pressed, send query.
        if (event.key === "Enter") {
            if (event.shiftKey) {
                setUserLlmChatInput(`${userLlmChatInput}\n`)
            } else if (!isEmptyExceptForWhitespace(userLlmChatInput)) {
                event.preventDefault()
                await sendQuery(userLlmChatInput)
            }
        }
    }

    function handleStop() {
        try {
            controller?.current?.abort("User cancelled request")
            controller.current = null
        } finally {
            setIsAwaitingLlm(false)
            setUserLlmChatInput("")
            currentResponse.current = ""
        }
    }

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = isEmptyExceptForWhitespace(userLlmChatInput)

    // Disable Send when request is in progress
    const shouldDisableSendButton = userInputEmpty || isAwaitingLlm

    // Disable Send when request is in progress
    const shouldDisableRegenerateButton = !previousUserQuery || isAwaitingLlm

    // Width for the various buttons -- "regenerate", "stop" etc.
    const buttonWidth = 126

    return (
        <Drawer // eslint-disable-line enforce-ids-in-jsx/missing-ids
            title="AI Decision Assistant"
            placement="right"
            closable={true}
            onClose={props.onClose}
            open={props.open}
            width="35%"
            destroyOnClose={true}
        >
            <Form
                id="user-query-form"
                onSubmit={handleUserQuery}
            >
                <Form.Group id="llm-chat-group">
                    <div
                        id="llm-response-div"
                        style={{width: "97%", height: "80vh", margin: "10px", display: "flow", position: "relative"}}
                    >
                        <Form.Control
                            id="llm-responses"
                            readOnly={true}
                            ref={llmOutputTextAreaRef}
                            as="textarea"
                            style={{
                                background: "ghostwhite",
                                borderColor: MaximumBlue,
                                fontFamily: "monospace",
                                fontSize: "smaller",
                                height: "100%",
                                resize: "none",
                                whiteSpace: "pre-wrap",
                            }}
                            value={userLlmChatOutput}
                        />
                        <Button
                            id="clear-chat-button"
                            onClick={() => {
                                setUserLlmChatOutput("")
                                chatHistory.current = []
                            }}
                            variant="secondary"
                            style={{
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                bottom: 10,
                                color: "white",
                                display: isAwaitingLlm ? "none" : "inline",
                                fontSize: "95%",
                                opacity: "70%",
                                position: "absolute",
                                right: 145,
                                width: buttonWidth,
                                zIndex: 99999,
                            }}
                        >
                            <BsStopBtn
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
                                fontSize: "95%",
                                opacity: "70%",
                                position: "absolute",
                                right: 10,
                                width: buttonWidth,
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
                                fontSize: "95%",
                                opacity: shouldDisableRegenerateButton ? "50%" : "70%",
                                position: "absolute",
                                right: 10,
                                width: buttonWidth,
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
                            <Form.Control
                                as="textarea"
                                id="user-input"
                                onChange={handleInputAreaChange}
                                onKeyUp={handleInputAreaKeyUp}
                                placeholder="What are the current prescribed actions?"
                                ref={inputAreaRef}
                                style={{
                                    fontSize: "90%",
                                    marginLeft: "7px",
                                }}
                                rows={3}
                                value={userLlmChatInput}
                            />
                            <Button
                                id="clear-input-button"
                                onClick={() => setUserLlmChatInput("")}
                                style={{
                                    backgroundColor: "transparent",
                                    border: "none",
                                    fontWeight: 550,
                                    left: "calc(100% - 45px)",
                                    top: 10,
                                    lineHeight: "35px",
                                    position: "absolute",
                                    width: "10px",
                                    zIndex: 99999,
                                }}
                            >
                                X
                            </Button>
                        </InputGroup>
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
                            <div
                                id="send-button-div"
                                style={{width: "4ch", lineHeight: 1.5}}
                            >
                                {isAwaitingLlm ? (
                                    <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                        // ClipLoader does not have an id property
                                        color={MaximumBlue}
                                        loading={true}
                                        size={20}
                                    />
                                ) : (
                                    "Send"
                                )}
                            </div>
                        </Button>
                    </div>
                </Form.Group>
            </Form>
        </Drawer>
    )
}

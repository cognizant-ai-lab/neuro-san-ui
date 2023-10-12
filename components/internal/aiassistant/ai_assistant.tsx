/**
 * This is the module for the "AI decision assistant".
 */
import ClipLoader from "react-spinners/ClipLoader"
import {Button, Form, InputGroup} from "react-bootstrap"
import {ChangeEvent, FormEvent, useRef, useState} from "react"
import {Drawer} from "antd"
import {MaximumBlue} from "../../../const"
import {sendDmsChatQuery} from "../../../controller/dmschat/dmschat"
import {StringToStringOrNumber} from "../../../controller/base_types"

/**
 * AI asssistant, intitially for DMS page but in theory could be used elsewhere.
 */
export function AIAssistant(props: {
    predictorUrls: string[]
    prescriptorUrl: string
    contextInputs: StringToStringOrNumber
    onClose: () => void
    open: boolean
    resetUndeployModelsTimer: () => void,
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

    function tokenReceived(token: string) {
        // Auto scroll as response is generated
        if (llmOutputTextAreaRef.current) {
            llmOutputTextAreaRef.current.scrollTop = llmOutputTextAreaRef.current.scrollHeight
        }
        setUserLlmChatOutput((currentOutput) => currentOutput + token);
    }

    /**
     * Highlights the final answer in the LLM output.
     */
    function highlightFinalAnswer() {
        // Highlight final answer
        const llmOutputTextArea = llmOutputTextAreaRef.current
        if (llmOutputTextArea) {
            const llmOutputText = llmOutputTextArea.value
            const finalAnswerRegex = /Final Answer: .*/u
            const finalAnswerMatch = llmOutputText.match(finalAnswerRegex)
            if (finalAnswerMatch) {
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
            setPreviousUserQuery(userQuery)

            // User interacted so reset timer
            props.resetUndeployModelsTimer()

            setIsAwaitingLlm(true)

            // Always start output by echoing user query
            setUserLlmChatOutput(`Query: ${userQuery}\n\n`)

            // Send the query to the server. Response will be streamed to our callback which updates the output
            // display as tokens are received.
            await sendDmsChatQuery(userQuery, props.contextInputs, props.prescriptorUrl, props.predictorUrls,
                tokenReceived)

            // Kick off highlighting final answer
            setTimeout(highlightFinalAnswer, 100)
        } catch (e) {
            setUserLlmChatOutput(`Internal error: \n\n${e}\n More information may be available in the browser console.`)
            console.error(e.stack)
        } finally {
            // Reset state, whatever happened during request
            setIsAwaitingLlm(false)
            setUserLlmChatInput("")
        }
    }

    /**
     * Tests if input contains only whitespace (meaning, not a valid query)
     *
     * @param input Input to be tested
     * @returns True if input contains only whitespace, false otherwise
     */
    function isEmptyExceptForWhitespace(input: string) {
        return !(/\S/u).test(input);
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
            if (!event.shiftKey) {
                if (!isEmptyExceptForWhitespace(userLlmChatInput)) {
                    event.preventDefault()
                    await sendQuery(userLlmChatInput)
                }
            } else {
                setUserLlmChatInput(userLlmChatInput + "\n")
            }
        }
    }

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = isEmptyExceptForWhitespace(userLlmChatInput)

    // Disable Send when request is in progress
    const shouldDisableSendButton = userInputEmpty || isAwaitingLlm

    // Disable Send when request is in progress
    const shouldDisableRegenerateButton = !previousUserQuery || isAwaitingLlm

    return <Drawer // eslint-disable-line enforce-ids-in-jsx/missing-ids
        title="AI Decision Assistant"
        placement="right"
        closable={true}
        onClose={props.onClose}
        open={props.open}
        width={"35%"}
        destroyOnClose={true}
    >
        <Form id="user-query-form" onSubmit={handleUserQuery}>
            <Form.Group id="llm-chat-group">
                <div id="llm-response-div"
                     style={{width: "97%", height: "80vh", margin: "10px", display: "flow", position: "relative"}}>
                    <Form.Control
                        id="llm-responses"
                        readOnly={true}
                        ref={llmOutputTextAreaRef}
                        as="textarea"
                        style={{
                            whiteSpace: "pre-wrap",
                            height: "100%",
                            background: "ghostwhite",
                            borderColor: MaximumBlue,
                            resize: "none",
                            fontFamily: "monospace",
                            fontSize: "smaller"
                        }}
                        value={userLlmChatOutput}
                    >
                    </Form.Control>
                    <Button id="regenerate-output-button"
                            onClick={() => sendQuery(previousUserQuery)}
                            disabled={shouldDisableRegenerateButton}
                            variant="secondary"
                            style={{
                                bottom: 10,
                                fontSize: "95%",
                                position: "absolute",
                                right: 10,
                                zIndex: 99999,
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                opacity: shouldDisableRegenerateButton ? "50%" : "70%",
                                color: "white",
                            }}
                    >
                        ⟳ Regenerate
                    </Button>
                </div>
                <div id="user-input-div" style={{display: "flex"}}>
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
                                marginLeft: "7px"
                            }}
                            rows={3}
                            value={userLlmChatInput}
                        />
                        <Button id="clear-input-button"
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
                                    zIndex: 99999
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
                               marginRight: "10px"
                            }}
                        ><div id="send-button-div" style={{width: "4ch", lineHeight: 1.5}}>
                            {isAwaitingLlm
                                ?   <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                                // ClipLoader does not have an id property
                                        color={MaximumBlue} loading={true} size={20}
                                    />
                                : "Send"
                            }
                        </div>
                        </Button>
                </div>
            </Form.Group>
        </Form>
    </Drawer>;
}
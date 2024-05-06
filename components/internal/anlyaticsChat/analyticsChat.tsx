/**
 * This is the module for the "AI decision assistant".
 */
import {Modal, Tooltip} from "antd"
import {ChatMessage as LangchainChatMessage} from "langchain/schema"
import {omit} from "lodash"
import {FormEvent, ReactElement, useEffect, useRef, useState} from "react"
import {Button, Form, InputGroup} from "react-bootstrap"
import {BsStopBtn, BsTrash} from "react-icons/bs"
import {FiRefreshCcw} from "react-icons/fi"
import {MdOutlineWrapText} from "react-icons/md"
import ClipLoader from "react-spinners/ClipLoader"

import {MaximumBlue} from "../../../const"
import {sendAnalyticsChatQuery} from "../../../controller/analyticsChat/analyticsChat"
import {fetchDataSources} from "../../../controller/datasources/fetch"
import {DataSources} from "../../../controller/datasources/types"
import {CsvDataChatResponse} from "../../../generated/analytics_chat"
import {ChatMessage as AnalyticsChatMessage, ChatMessageChatMessageType} from "../../../generated/chat"
import {hasOnlyWhitespace} from "../../../utils/text"
import BlankLines from "../../blanklines"
import {NotificationType, sendNotification} from "../../notification"

interface AnalyticsChatProps {
    readonly projectId: number
    readonly dataSourceId: number
    readonly user: string
}

/**
 * Analytics Chat page. For using an LLM to analyze your data, and graph it in various ways using a backend service.
 */
export function AnalyticsChat(props: AnalyticsChatProps): ReactElement {
    // Previous user query (for "regenerate" feature)
    const [previousUserQuery, setPreviousUserQuery] = useState<string>("")

    // User LLM chat output
    const [userLlmChatOutput, setUserLlmChatOutput] = useState<string>("")

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    // User input
    const [userInput, setUserInput] = useState<string>("")

    // Use useRef here since we don't want changes in the chat history to trigger a re-render
    const chatHistory = useRef<LangchainChatMessage[]>([])

    // To accumulate current response, which will be different than the contents of the output window if there is a
    // chat session
    const currentResponse = useRef<string>("")

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

    // Data source URL
    const [dataSourceUrl, setDataSourceUrl] = useState<string>("")

    const [imageData, setImageData] = useState<Uint8Array>(null)

    const [showPlot, setShowPlot] = useState<boolean>(false)

    function clearInput() {
        setUserInput("")
    }

    // Create img tag from data in Uint8Array format
    function getImage(): JSX.Element {
        return (
            // We don't want the fancy NextJS image features here
            // eslint-disable-next-line @next/next/no-img-element
            <img
                id="plot-img"
                src={`data:image/png;base64,${imageData}`}
                alt="plot"
            />
        )
    }

    useEffect(() => {
        // Delay for a second before focusing on the input area; gets around ChatBot stealing focus.
        setTimeout(() => {
            inputAreaRef?.current?.focus()
        }, 1000)
    }, [])

    useEffect(() => {
        async function retrieveDataSourceUrl() {
            if (props.dataSourceId && props.projectId && props.user) {
                const dataSources: DataSources = await fetchDataSources(
                    props.user,
                    props.projectId,
                    props.dataSourceId,
                    ["s3_url"]
                )
                if (dataSources.length > 0) {
                    setDataSourceUrl(dataSources[0].s3_url)
                } else {
                    sendNotification(
                        NotificationType.error,
                        `Unable to retrieve data source for project ${props.projectId} ` +
                            `data source ID ${props.dataSourceId}`
                    )
                }
            }
        }

        void retrieveDataSourceUrl()
    }, [props.dataSourceId])

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
    }

    function convertToAnalyticsChatHistory(messages: LangchainChatMessage[]): AnalyticsChatMessage[] {
        return messages.map((message) => {
            return AnalyticsChatMessage.toJSON({
                type: message.role === "human" ? ChatMessageChatMessageType.HUMAN : ChatMessageChatMessageType.AI,
                text: message.content as string,
                imageData: undefined,
            }) as AnalyticsChatMessage
        })
    }

    // Sends user query to backend.
    async function sendQuery(userQuery: string) {
        try {
            // Enable autoscrolling by default
            autoScrollEnabled.current = true

            // Record user query in chat history
            chatHistory.current = [...chatHistory.current, new LangchainChatMessage(userQuery, "human")]

            // Save previous query for "regenerate" feature
            setPreviousUserQuery(userQuery)

            setIsAwaitingLlm(true)

            setImageData(null)

            // Always start output by echoing user query
            setUserLlmChatOutput((currentOutput) => `${currentOutput}\nQuery:\n${userQuery}\n\nResponse:`)

            const abortController = new AbortController()
            controller.current = abortController

            // Send the query to the server. Response will be streamed to our callback which updates the output
            // display as tokens are received.
            try {
                await sendAnalyticsChatQuery(
                    tokenReceivedHandler,
                    abortController.signal,
                    [{url: dataSourceUrl, versionId: null, user: {login: props.user}}],
                    convertToAnalyticsChatHistory(chatHistory.current)
                )
            } catch (e) {
                if (e instanceof Error && e.name === "AbortError") {
                    setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\nRequest cancelled.\n\n`)
                } else {
                    // Add error to output
                    setUserLlmChatOutput((currentOutput) => `${currentOutput}\n\nError occurred: ${e}\n\n`)

                    // log error to console
                    console.error(e)
                }
            }

            // Extract response
            const responseAsJSON = JSON.parse(currentResponse.current)

            // Did we get an image? If so, display it.
            // Note: we are in "pre-conversion" world here so we have to use snake case. We do it this way because
            // we need the image bytes in base64, which they are at this point. After the conversion step below,
            // they will be in binary which is no use to us for building an <img> tag. The alternative would be to
            // let the conversion happen, then convert *back* to base64 which is ugly and inefficient.
            if (responseAsJSON?.chat_response?.image_data?.image_bytes) {
                setImageData(responseAsJSON.chat_response.image_data.image_bytes)
                setShowPlot(true)
            }

            const response: CsvDataChatResponse = CsvDataChatResponse.fromJSON(responseAsJSON)

            // Get last message from response
            const lastMessage = response.chatResponse

            // Add response to chat output
            setUserLlmChatOutput((currentOutput) => `${currentOutput}\n${lastMessage?.text}\n`)

            // Record bot answer in history.
            if (currentResponse.current) {
                // remove imageBytes from response to save tokens since all history gets sent to LLM each time
                const responseWithoutImageBytes = omit(responseAsJSON, ["chat_response.image_data"])
                chatHistory.current = [
                    ...chatHistory.current,
                    new LangchainChatMessage(JSON.stringify(responseWithoutImageBytes), "ai"),
                ]
            }
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
        await sendQuery(userInput)
    }

    function handleStop() {
        try {
            controller?.current?.abort()
            controller.current = null
        } finally {
            setIsAwaitingLlm(false)
            clearInput()
            currentResponse.current = ""
        }
    }

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !userInput || userInput.length === 0 || hasOnlyWhitespace(userInput)

    // Disable Send when request is in progress
    const shouldDisableSendButton = userInputEmpty || isAwaitingLlm || !dataSourceUrl

    // Disable Send when request is in progress
    const shouldDisableRegenerateButton = !previousUserQuery || isAwaitingLlm

    // Width for the various buttons -- "regenerate", "stop" etc.
    const actionButtonWidth = 126

    const disableClearChatButton = isAwaitingLlm || userLlmChatOutput.length === 0

    return (
        <>
            <div
                id="plot-div"
                style={{position: "absolute", top: "50%", left: "50%"}}
            >
                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <Modal
                    open={showPlot && imageData?.length > 0}
                    destroyOnClose={true}
                    closable={true}
                    onOk={() => setShowPlot(false)}
                    onCancel={() => setShowPlot(false)}
                    okButtonProps={{
                        id: "confirmation-modal-ok-btn",
                    }}
                    okType="primary"
                    maskClosable={true}
                    width="50%"
                    zIndex={99999}
                    cancelButtonProps={{style: {display: "none"}}}
                >
                    {imageData && getImage()}
                </Modal>
            </div>
            <Form
                id="user-query-form"
                onSubmit={handleUserQuery}
            >
                <Form.Group id="llm-chat-group">
                    <div
                        id="llm-response-div"
                        style={{height: "60vh", margin: "10px", position: "relative"}}
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
                            placeholder="(Analytics Chat output will appear here)"
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
                                currentResponse.current = ""
                                setImageData(null)
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
                        id="user-input-div"
                        style={{display: "flex"}}
                    >
                        <InputGroup id="user-input-group">
                            <Form.Control
                                id="user-input"
                                type="text"
                                placeholder="Message the analytics chat agent"
                                ref={inputAreaRef}
                                style={{
                                    fontSize: "90%",
                                    marginLeft: "7px",
                                }}
                                onChange={(event) => {
                                    setUserInput(event.target.value)
                                }}
                                value={userInput}
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

/**
 * This is the module for the "AI decision assistant".
 */

import {ChatMessage as LangchainChatMessage} from "@langchain/core/messages"
import ClearIcon from "@mui/icons-material/Clear"
import Box from "@mui/material/Box"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import {omit} from "lodash"
import {ReactElement, useEffect, useRef, useState} from "react"
import {MdOutlineWrapText} from "react-icons/md"

import {sendAnalyticsChatQuery} from "../../../controller/analyticsChat/analyticsChat"
import {fetchDataSources} from "../../../controller/datasources/fetch"
import {CsvDataChatResponse} from "../../../generated/analytics_chat"
import {ChatMessage as AnalyticsChatMessage, ChatMessageChatMessageType} from "../../../generated/chat"
import {DataSource} from "../../../generated/metadata"
import {hasOnlyWhitespace} from "../../../utils/text"
import {ControlButtons} from "../../AgentChat/ControlButtons"
import {SendButton} from "../../AgentChat/SendButton"
import {ConfirmationModal} from "../../confirmationModal"
import {NotificationType, sendNotification} from "../../notification"
import {LlmChatOptionsButton} from "../LlmChatOptionsButton"

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
                const dataSources: DataSource[] = await fetchDataSources(
                    props.user,
                    props.projectId,
                    props.dataSourceId,
                    ["s3_url"]
                )
                if (dataSources.length > 0) {
                    const dataSourceAsObject = DataSource.fromJSON(dataSources[0])
                    setDataSourceUrl(dataSourceAsObject.s3Url)
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

    // Enable regenerate button when there is a previous query to resent, and we're not awaiting a response
    const shouldEnableRegenerateButton = previousUserQuery && !isAwaitingLlm

    // Enable Clear Chat button if not awaiting response and there is chat output to clear
    const enableClearChatButton = !isAwaitingLlm && userLlmChatOutput.length > 0

    return (
        <>
            <div
                id="plot-div"
                style={{position: "absolute", top: "50%", left: "50%"}}
            >
                {showPlot && imageData?.length > 0 && (
                    <ConfirmationModal
                        content={imageData && getImage()}
                        handleOk={() => setShowPlot(false)}
                        id="show-plot-confirmation-dialog"
                        okBtnLabel="OK"
                        title="Chart"
                    />
                )}
            </div>
            <Box id="user-query-form">
                <Box
                    id="llm-response-div"
                    sx={{
                        height: "30rem",
                        position: "relative",
                        border: "none !important",
                    }}
                    tabIndex={-1}
                >
                    <Tooltip
                        id="wrap-tooltip"
                        title="Wrap/unwrap text"
                    >
                        <LlmChatOptionsButton
                            id="wrap-button"
                            onClick={() => setShouldWrapOutput(!shouldWrapOutput)}
                            enabled={shouldWrapOutput}
                            posRight={10}
                            posBottom={10}
                        >
                            <MdOutlineWrapText
                                id="wrap-icon"
                                size="15px"
                                style={{color: "white"}}
                            />
                        </LlmChatOptionsButton>
                    </Tooltip>
                    <TextField
                        id="llm-responses"
                        tabIndex={-1}
                        slotProps={{
                            input: {
                                readOnly: true,
                                disableUnderline: true,
                                sx: {
                                    borderColor: "var(--bs-primary)",
                                    borderRadius: "var(--bs-border-radius)",
                                    borderStyle: "solid !important",
                                    borderWidth: "1px",
                                    height: "100%",
                                    width: "100%",
                                    alignItems: "flex-start",
                                    overflowY: "scroll",
                                },
                            },
                        }}
                        inputRef={llmOutputTextAreaRef}
                        multiline
                        placeholder="(Analytics Chat output will appear here)"
                        sx={{
                            backgroundColor: "ghostwhite",
                            fontFamily: "monospace",
                            fontSize: "smaller",
                            height: "100%",
                            width: "100%",
                            whiteSpace: shouldWrapOutput ? "pre-wrap" : "pre",
                            "& .MuiOutlinedInput-root": {
                                "& fieldset": {
                                    border: "none",
                                },
                                "&.Mui-focused fieldset": {
                                    border: "none",
                                },
                                "&:hover fieldset": {
                                    border: "none",
                                },
                            },
                        }}
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

                    <ControlButtons // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        clearChatOnClickCallback={() => {
                            chatHistory.current = []
                            setPreviousUserQuery("")
                            setUserLlmChatOutput("")
                            chatHistory.current = []
                            currentResponse.current = ""
                            setImageData(null)
                        }}
                        enableClearChatButton={enableClearChatButton}
                        isAwaitingLlm={isAwaitingLlm}
                        handleSend={sendQuery}
                        handleStop={handleStop}
                        previousUserQuery={previousUserQuery}
                        shouldEnableRegenerateButton={shouldEnableRegenerateButton}
                    />
                </Box>

                <div
                    id="user-input-div"
                    style={{display: "flex", marginBottom: "20rem"}}
                >
                    <TextField
                        id="user-input"
                        type="text"
                        placeholder="Message the analytics chat agent"
                        inputRef={inputAreaRef}
                        sx={{
                            fontSize: "90%",
                            width: "100%",
                            height: "100%",
                            marginTop: "1rem",
                        }}
                        onChange={(event) => {
                            setUserInput(event.target.value)
                        }}
                        value={userInput}
                        slotProps={{
                            input: {
                                sx: {
                                    borderColor: "var(--bs-primary)",
                                    borderRadius: "var(--bs-border-radius)",
                                    borderWidth: "1px",
                                },
                                endAdornment: (
                                    <InputAdornment
                                        id="clear-input-adornment"
                                        position="end"
                                        disableTypography={true}
                                    >
                                        <IconButton
                                            id="clear-input-button"
                                            onClick={() => {
                                                clearInput()
                                            }}
                                            sx={{
                                                color: "var(--bs-primary)",
                                                opacity: userInputEmpty ? "25%" : "100%",
                                            }}
                                            disabled={userInputEmpty}
                                            tabIndex={-1}
                                            edge="end"
                                        >
                                            <ClearIcon id="clear-input-icon" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    <div
                        id="send-div"
                        style={{
                            display: "flex",
                            width: "100px",
                            justifyContent: "center",
                            marginTop: "1rem",
                            marginLeft: "0.1rem",
                        }}
                    >
                        {isAwaitingLlm ? (
                            <CircularProgress
                                id="send-query-spinner"
                                size={45}
                                sx={{color: "var(--bs-primary)"}}
                            />
                        ) : (
                            <SendButton
                                enableSendButton={!shouldDisableSendButton}
                                id="submit-query-button"
                                onClickCallback={async () => {
                                    await sendQuery(userInput)
                                }}
                            />
                        )}
                    </div>
                </div>
            </Box>
        </>
    )
}

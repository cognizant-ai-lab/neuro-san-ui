/**
 * This is the module for the "DMS Chat assistant".
 */
import {AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages"
import {Loop} from "@mui/icons-material"
import ClearIcon from "@mui/icons-material/Clear"
import DeleteOutline from "@mui/icons-material/DeleteOutline"
import StopCircle from "@mui/icons-material/StopCircle"
import Box from "@mui/material/Box"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import TextField from "@mui/material/TextField"
import {ReactElement, useRef, useState} from "react"

import {StringToStringOrNumber} from "../../../controller/base_types"
import {sendDmsChatQuery} from "../../../controller/dmschat/dmschat"
import {Run} from "../../../controller/run/types"
import {hasOnlyWhitespace} from "../../../utils/text"
import {MUIDrawer} from "../../MUIDrawer"
import {LlmChatButton} from "../LlmChatButton"
import {AgentChatButtons} from "../../AgentChat/AgentChatButtons"

/**
 * Chat assistant, initially for DMS page but in theory could be used elsewhere. Allows the user to chat with an LLM
 * (via the backend) with full context about the current DMS page, in a question-and-answer chat format.
 */
export function DMSChat(props: {
    predictorUrls: string[]
    prescriptorUrl: string
    contextInputs: StringToStringOrNumber
    onClose: () => void
    open: boolean
    run: Run
    projectName?: string
    projectDescription?: string
}): ReactElement {
    // Previous user query (for "regenerate" feature)
    const [previousUserQuery, setPreviousUserQuery] = useState<string>("")

    // User LLM chat output
    const [userLlmChatOutput, setUserLlmChatOutput] = useState<string>("")

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    // User input
    const [userInput, setUserInput] = useState<string>("")

    // Use useRef here since we don't want changes in the chat history to trigger a re-render
    const chatHistory = useRef<BaseMessage[]>([])

    // To accumulate current response, which will be different than the contents of the output window if there is a
    // chat session
    const currentResponse = useRef<string>("")
    // Ref for output text area, so we can auto scroll it
    const llmOutputTextAreaRef = useRef(null)

    // Ref for user input text area, so we can handle shift-enter
    const inputAreaRef = useRef(null)

    // Controller for cancelling fetch request
    const controller = useRef<AbortController>(null)

    function clearInput() {
        setUserInput("")
    }
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
                const finalAnswerIndex = llmOutputText.lastIndexOf(finalAnswer)
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
            chatHistory.current = [...chatHistory.current, new HumanMessage(userQuery)]

            setPreviousUserQuery(userQuery)

            setIsAwaitingLlm(true)

            // Always start output by echoing user query
            setUserLlmChatOutput((currentOutput) => `${currentOutput}\nQuery:\n${userQuery}\n\nResponse:\n\n`)

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
                props.run,
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
                chatHistory.current = [...chatHistory.current, new AIMessage(finalAnswer[0])]
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
    const shouldDisableSendButton = userInputEmpty || isAwaitingLlm

    // Enable regenerate button when there is a previous query to resent, and we're not awaiting a response
    const shouldEnableRegenerateButton = previousUserQuery && !isAwaitingLlm

    // Enable Clear Chat button if not awaiting response and there is chat output to clear
    const enableClearChatButton = !isAwaitingLlm && userLlmChatOutput.length > 0

    return (
        <MUIDrawer
            id="user-query-drawer"
            isOpen={props.open}
            onClose={props.onClose}
            paperProps={{
                sx: {
                    width: "35%",
                },
            }}
            title="AI Decision Assistant"
        >
            <Box
                id="user-query-form"
                sx={{height: "90vh"}}
            >
                <Box
                    id="llm-response-div"
                    sx={{
                        height: "80vh",
                        position: "relative",
                        border: "none !important",
                        padding: "10px",
                    }}
                    tabIndex={-1}
                >
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
                        placeholder="(DMS Chat output will appear here)"
                        sx={{
                            backgroundColor: "ghostwhite",
                            fontFamily: "monospace",
                            fontSize: "smaller",
                            height: "100%",
                            width: "100%",
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
                    />

                    <AgentChatButtons
                        clearChatOnClickCallback={() => {
                            chatHistory.current = []
                            currentResponse.current = ""
                            setPreviousUserQuery("")
                            setUserLlmChatOutput("")
                        }}
                        enableClearChatButton={enableClearChatButton}
                        isAwaitingLlm={isAwaitingLlm}
                        handleSend={sendQuery}
                        handleStop={handleStop}
                        previousUserQuery={previousUserQuery}
                        shouldEnableRegenerateButton={shouldEnableRegenerateButton}
                    />
                </Box>

                <Box
                    id="user-input-div"
                    style={{display: "flex", padding: "10px"}}
                >
                    <TextField
                        id="user-input"
                        type="text"
                        placeholder="What are the prescribed actions?"
                        inputRef={inputAreaRef}
                        multiline={true}
                        sx={{
                            fontSize: "90%",
                            width: "100%",
                            height: "100%",
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
                            marginLeft: "1rem",
                        }}
                    >
                        {isAwaitingLlm ? (
                            <CircularProgress
                                id="send-query-spinner"
                                size={45}
                                sx={{color: "var(--bs-primary)"}}
                            />
                        ) : (
                            <LlmChatButton
                                id="submit-query-button"
                                disabled={shouldDisableSendButton}
                                onClick={async () => {
                                    await sendQuery(userInput)
                                }}
                                posBottom={0}
                                posRight={0}
                                sx={{
                                    opacity: shouldDisableSendButton ? "50%" : "100%",
                                    color: "white !important",
                                    fontSize: "15px",
                                    fontWeight: "500",
                                    lineHeight: "38px",
                                    padding: "2px",
                                    position: "relative",
                                    width: 126,
                                }}
                            >
                                Send
                            </LlmChatButton>
                        )}
                    </div>
                </Box>
            </Box>
        </MUIDrawer>
    )
}

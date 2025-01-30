import {jsonrepair} from "jsonrepair"
import {capitalize} from "lodash"
import {CSSProperties, Dispatch, MutableRefObject, ReactNode, SetStateAction} from "react"
import SyntaxHighlighter from "react-syntax-highlighter"

import {experimentGeneratedMessage} from "./common"
import {MAX_ORCHESTRATION_ATTEMPTS} from "./const"
import {sendChatQuery} from "../../../controller/agent/agent"
import {ChatResponse} from "../../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../../generated/neuro_san/api/grpc/chat"
import {MUIAccordion} from "../../MUIAccordion"
import {MUIAlert} from "../../MUIAlert"

// Delimiter for separating logs from agents
const LOGS_DELIMITER = ">>>"

/**
 * Split a log line into its summary and details parts, using `LOGS_DELIMITER` as the separator. If the delimiter is not
 * found, the entire log line is treated as the details part. This can happen when it's a "follow-on" message from
 * an agent we've already heard from.
 * @param logLine The log line to split
 * @returns An object containing the summary and details parts of the log line
 */
function splitLogLine(logLine: string) {
    if (logLine.includes(LOGS_DELIMITER)) {
        const logLineElements = logLine.split(LOGS_DELIMITER)

        const logLineSummary = logLineElements[0]
        const summarySentenceCase = logLineSummary.replace(/\w+/gu, capitalize)

        const logLineDetails = logLineElements[1]
        return {summarySentenceCase, logLineDetails}
    } else {
        return {summarySentenceCase: "Agent message", logLineDetails: logLine}
    }
}

/**
 * Process a log line from the agent and format it nicely using the syntax highlighter and Accordion components.
 * By the time we get to here, it's assumed things like errors and termination conditions have already been handled.
 *
 * @param logLine The log line to process
 * @param highlighterTheme The theme to use for the syntax highlighter
 * @returns A React component representing the log line (agent message)
 */
export function processLogLine(logLine: string, highlighterTheme: {[p: string]: CSSProperties}) {
    // extract the parts of the line
    const {summarySentenceCase, logLineDetails} = splitLogLine(logLine)

    let repairedJson: string = null

    try {
        // Attempt to parse as JSON

        // First, repair it
        repairedJson = jsonrepair(logLineDetails)

        // Now try to parse it. We don't care about the result, only if it throws on parsing.
        JSON.parse(repairedJson)
    } catch (e) {
        // Not valid JSON
        repairedJson = null
    }

    return (
        <MUIAccordion
            id={`${summarySentenceCase}-panel`}
            items={[
                {
                    title: summarySentenceCase,
                    content: (
                        <div id={`${summarySentenceCase}-details`}>
                            {/* If we managed to parse it as JSON, pretty print it */}
                            {repairedJson ? (
                                <SyntaxHighlighter
                                    id="syntax-highlighter"
                                    language="json"
                                    style={highlighterTheme}
                                    showLineNumbers={false}
                                    wrapLines={true}
                                >
                                    {repairedJson}
                                </SyntaxHighlighter>
                            ) : (
                                logLineDetails || "No further details"
                            )}
                        </div>
                    ),
                },
            ]}
            sx={{
                fontSize: "large",
                marginBottom: "1rem",
            }}
        />
    )
}

interface AgentErrorProps {
    error: string
    traceback?: string
    tool?: string
}

class AgentError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "AgentError"
    }
}

/**
 * Handle a chunk of data received from the server. This is the main entry point for processing the data received from
 * neuro-san streaming chat.
 *
 * @param chunk The chunk of data received from the server. This is expected to be a JSON object with a `response` key.
 * @param projectUrl Mutable reference to the URL of the project that will be created. We update this as a side effect.
 * @param updateOutput Function to update the output window.
 * @param highlighterTheme The theme to use for the syntax highlighter.
 * @param setIsAwaitingLlm Function to set the state of whether we're awaiting a response from LLM.
 */
export function handleStreamingReceived(
    chunk: string,
    projectUrl: MutableRefObject<URL>,
    updateOutput: (node: ReactNode) => void,
    highlighterTheme: {[p: string]: CSSProperties},
    setIsAwaitingLlm: Dispatch<SetStateAction<boolean>>
): void {
    let chatResponse: ChatResponse
    try {
        chatResponse = JSON.parse(chunk).result
    } catch (e) {
        console.error(`Error parsing log line: ${e}`)
        return
    }
    const chatMessage: ChatMessage = chatResponse.response

    const messageType: ChatMessageChatMessageType = chatMessage?.type

    const knownMessageTypes = [ChatMessageChatMessageType.AI, ChatMessageChatMessageType.LEGACY_LOGS]

    // Check if it's a message type we know how to handle
    if (!knownMessageTypes.includes(messageType)) {
        return
    }

    let chatMessageJson: object = null

    // LLM sometimes wraps the JSON in markdown code blocks, so we need to remove them before parsing
    const chatMessageCleaned = chatMessage.text.replace(/```json/gu, "").replace(/```/gu, "")

    try {
        chatMessageJson = JSON.parse(chatMessageCleaned)
    } catch (error) {
        // Not JSON-like, so just add it to the output
        if (error instanceof SyntaxError) {
            // Regular chat message (not error or end condition) so just add it to the output
            const newOutputItem = processLogLine(chatMessage.text, highlighterTheme)
            updateOutput(newOutputItem)
            return
        } else {
            // Not an expected error, so rethrow it for someone else to figure out.
            throw error
        }
    }

    // It was JSON-like. Figure out what we're dealing with
    // LLM sometimes wraps the JSON in markdown code blocks, so we need to remove them before parsing
    if ("project_id" in chatMessageJson && "experiment_id" in chatMessageJson) {
        const baseUrl = window.location.origin

        // Set the URL for displaying to the user
        projectUrl.current = new URL(
            `/projects/${chatMessageJson.project_id}/experiments/${chatMessageJson.experiment_id}/?generated=true`,
            baseUrl
        )

        // Generate the "experiment complete" item in the agent dialog
        updateOutput(
            <>
                <MUIAccordion
                    id="experiment-generation-complete-panel"
                    items={[
                        {
                            title: "Experiment generation complete",
                            content: (
                                <p id="experiment-generation-complete-details">
                                    {experimentGeneratedMessage(projectUrl.current)}
                                </p>
                            ),
                        },
                    ]}
                    sx={{fontSize: "large"}}
                />
                <br id="experiment-generation-complete-br" />
            </>
        )
        setIsAwaitingLlm(false)
    } else if ("error" in chatMessageJson) {
        const agentError: AgentErrorProps = chatMessageJson as AgentErrorProps
        const errorMessage =
            `Error occurred. Error: "${agentError.error}", ` +
            `traceback: "${agentError?.traceback}", ` +
            `tool: "${agentError?.tool}" Retrying...`
        updateOutput(
            <MUIAlert
                id="retry-message-alert"
                severity="warning"
            >
                {errorMessage}
            </MUIAlert>
        )
        setIsAwaitingLlm(false)
        throw new AgentError(errorMessage)
    }
}

/**
 * Sends the request to neuro-san to create the project and experiment.
 *
 */
export async function sendStreamingChatRequest(
    projectUrl: MutableRefObject<URL>,
    updateOutput: (node: ReactNode) => void,
    highlighterTheme: {[p: string]: CSSProperties},
    setIsAwaitingLlm: Dispatch<SetStateAction<boolean>>,
    controller: MutableRefObject<AbortController>,
    currentUser: string,
    inputOrganization: string,
    dataGeneratorResponse: string
) {
    // Reset project URL
    projectUrl.current = null

    // Set up the abort controller
    const abortController = new AbortController()
    controller.current = abortController

    // The input to Orchestration is the organization name, if we have it, plus the Python code that generates
    // the data.
    const orchestrationQuery =
        (inputOrganization ? `Organization in question: ${inputOrganization}\n` : "") + dataGeneratorResponse

    updateOutput(
        <MUIAccordion
            id="initiating-orchestration-accordion"
            items={[
                {
                    title: "Contacting orchestration agents...",
                    content: `Query: ${orchestrationQuery}`,
                },
            ]}
            sx={{marginBottom: "1rem"}}
        />
    )

    let orchestrationAttemptNumber = 1

    do {
        try {
            setIsAwaitingLlm(true)

            // Send the chat query to the server. This will block until the stream ends from the server
            const response: ChatResponse = await sendChatQuery(
                abortController.signal,
                orchestrationQuery,
                currentUser,
                (chunk) => handleStreamingReceived(chunk, projectUrl, updateOutput, highlighterTheme, setIsAwaitingLlm)
            )

            console.debug(`Orchestration attempt ${orchestrationAttemptNumber} complete. Response: ${response}`)
        } catch (error: unknown) {
            if (error instanceof Error) {
                // If the user clicked Stop, just bail
                if (error.name === "AbortError") {
                    return
                }

                orchestrationAttemptNumber += 1

                // Agent errors are handled elsewhere
                if (!(error instanceof AgentError)) {
                    updateOutput(
                        <MUIAlert
                            id="opp-finder-error-occurred-while-interacting-with-agents-alert"
                            severity="error"
                        >
                            {`Internal Error occurred while interacting with agents. Exception: ${error}`}
                        </MUIAlert>
                    )
                }
            }
        } finally {
            setIsAwaitingLlm(false)
        }
    } while (orchestrationAttemptNumber <= MAX_ORCHESTRATION_ATTEMPTS && projectUrl.current === null)

    if (orchestrationAttemptNumber >= MAX_ORCHESTRATION_ATTEMPTS && projectUrl.current === null) {
        updateOutput(
            <MUIAlert
                id="opp-finder-max-retries-exceeded-alert"
                severity="error"
            >
                {`Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`}
            </MUIAlert>
        )
    }
}

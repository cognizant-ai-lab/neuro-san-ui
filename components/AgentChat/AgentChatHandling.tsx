import {jsonrepair} from "jsonrepair"
import {capitalize} from "lodash"
import {MutableRefObject, ReactNode} from "react"
import SyntaxHighlighter from "react-syntax-highlighter"

import {AgentError, CombinedAgentType, LOGS_DELIMITER} from "./common"
import {HIGHLIGHTER_THEME, MAX_AGENT_RETRIES} from "./const"
import {sendChatQuery} from "../../controller/agent/agent"
import {AgentType} from "../../generated/metadata"
import {ChatMessageChatMessageType} from "../../generated/neuro_san/api/grpc/chat"
import {MUIAccordion} from "../MUIAccordion"
import {MUIAlert} from "../MUIAlert"

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
 * @param messageType The type of the message (AI, LEGACY_LOGS etc.). Used for displaying certain message types
 * differently
 * @returns A React component representing the log line (agent message)
 */
export function processLogLine(logLine: string, messageType?: ChatMessageChatMessageType): ReactNode {
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

    const isAIMessage = messageType === ChatMessageChatMessageType.AI

    return (
        <MUIAccordion
            id={`${summarySentenceCase}-panel`}
            defaultExpandedPanelKey={isAIMessage ? 1 : null}
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
                                    style={HIGHLIGHTER_THEME}
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
                backgroundColor: isAIMessage ? "var(--bs-accent3-light)" : undefined,
            }}
        />
    )
}

/**
 * Sends the request to neuro-san to create the project and experiment.
 *
 * @param updateOutput Function to display agent chat responses to the user
 * @param controller Mutable reference to the AbortController used to cancel the request
 * @param currentUser The current user (for displaying in the UI and for letting the server know who is calling)
 * @param query The query to send to the server
 * @param targetAgent The target agent to send the request to
 * @param callback The callback to call when streaming chunks are received
 * @param checkSuccess User-supplied predicate to check if the agents succeeded in their task
 * @returns Nothing, but received chunks are pumped to the supplied callback function
 */
export async function sendStreamingChatRequest(
    updateOutput: (node: ReactNode) => void,
    controller: MutableRefObject<AbortController>,
    currentUser: string,
    query: string,
    targetAgent: CombinedAgentType,
    callback: (chunk: string) => void,
    checkSuccess: () => boolean = () => true
): Promise<void> {
    // Set up the abort controller
    const abortController = new AbortController()
    controller.current = abortController

    let attemptNumber = 0

    let succeeded: boolean = false
    do {
        try {
            // Increment the attempt number and set the state to indicate we're awaiting a response
            attemptNumber += 1

            // Send the chat query to the server. This will block until the stream ends from the server
            await sendChatQuery(abortController.signal, query, currentUser, targetAgent as AgentType, callback)

            succeeded = checkSuccess()
        } catch (error: unknown) {
            if (error instanceof Error) {
                // If the user clicked Stop, just bail
                if (error.name === "AbortError") {
                    return
                }

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
        }
    } while (attemptNumber < MAX_AGENT_RETRIES && !succeeded)

    if (!succeeded) {
        updateOutput(
            <MUIAlert
                id="opp-finder-max-retries-exceeded-alert"
                severity="error"
            >
                {`Gave up after ${MAX_AGENT_RETRIES} attempts.`}
            </MUIAlert>
        )
    }
}
